import { Injectable, LOCALE_ID, inject } from '@angular/core';
import { WheelConfigurator } from './wheel-configurator.service';
import { NativePlatformService } from './native-platform.service';
import { DefaultSoundPlayer, SPIN_EASING, easeCubicBezier } from './default-sounds';
import { buildWinnerScene, drawWinnerFrame, type WinnerScene } from '../shared/winner-share/winner-share-scene';

/** Portrait 4:5, the tallest ratio Instagram keeps uncropped in the feed. */
const IMAGE_SIZE = { width: 1080, height: 1350 };
/** Vertical 9:16 for Reels, TikTok and Shorts; 720p keeps in-browser encoding smooth. */
const CLIP_SIZE = { width: 720, height: 1280 };
const CLIP_FPS = 30;
const CLIP_BITRATE = 5_000_000;

/** Clip timeline, in ms. The spin itself lasts as long as it did on screen. */
const INTRO_MS = 600;
const PAUSE_MS = 250;
const REVEAL_MS = 700;
const HOLD_MS = 2600;
/** A very long spin setting would make a clip nobody watches to the end. */
const MAX_SPIN_MS = 12_000;

/** Preferred first: MP4 plays everywhere, WebM is the Chrome/Firefox fallback. */
const CLIP_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

export interface WinnerClip {
  blob: Blob;
  filename: string;
}

/**
 * Turns the current winner into something people post: a still image, or a
 * short vertical video replaying the spin. See `winner-share-scene.ts` for
 * what is drawn.
 */
@Injectable({ providedIn: 'root' })
export class WinnerShareService {
  private readonly cfg = inject(WheelConfigurator);
  private readonly native = inject(NativePlatformService);
  private readonly locale = inject(LOCALE_ID);

  readonly clipMimeType = pickClipMimeType();

  /** False where the browser cannot record a canvas (old Safari, jsdom). */
  readonly canRecordClip =
    !!this.clipMimeType &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function';

  /**
   * True where handing the file to the system share sheet beats downloading
   * it: the app, and touch devices whose browser can share files. On desktop
   * the share sheet is a detour, so the file is simply saved.
   */
  get prefersShareSheet(): boolean {
    if (this.native.isNative) return true;
    // Also evaluated while prerendering, where none of these exist.
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.canShare !== 'function' ||
      typeof File === 'undefined'
    ) {
      return false;
    }
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    return coarse && navigator.canShare({ files: [probe] });
  }

  async renderImage(): Promise<WinnerClip | null> {
    const scene = await this.buildScene();
    if (!scene) return null;

    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE.width;
    canvas.height = IMAGE_SIZE.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    drawWinnerFrame(ctx, canvas.width, canvas.height, scene, {
      rotation: scene.finalRotation,
      reveal: 1,
      confettiTime: 0,
      still: true,
    });

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? { blob, filename: `${this.fileStem(scene.winner)}.png` } : null;
  }

  /**
   * Records the clip in real time (a canvas stream cannot be encoded faster
   * than it plays), so it takes as long as the clip lasts. `onProgress`
   * receives 0-1; aborting `signal` stops and discards the recording.
   */
  async recordClip(onProgress: (progress: number) => void, signal: AbortSignal): Promise<WinnerClip | null> {
    if (!this.canRecordClip || !this.clipMimeType) return null;

    const spin = this.cfg.lastSpin();
    const winner = this.cfg.winner();
    const replay = spin && spin.winner === winner && spin.workspaceId === this.cfg.activeWheelId() ? spin : null;

    const scene = await this.buildScene(replay?.endRotation);
    if (!scene || signal.aborted) return null;

    // Without a recorded spin (e.g. a multi-wheel preview), replay a
    // plausible one that lands on the same slice.
    const endRotation = scene.finalRotation;
    const startRotation = replay?.startRotation ?? endRotation - 360 * 6 - 137;
    const spinMs = Math.min(MAX_SPIN_MS, Math.max(1500, replay?.durationMs ?? this.cfg.spinDurationMs()));
    const revealAt = INTRO_MS + spinMs + PAUSE_MS;
    const totalMs = revealAt + REVEAL_MS + HOLD_MS;

    const canvas = document.createElement('canvas');
    canvas.width = CLIP_SIZE.width;
    canvas.height = CLIP_SIZE.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const draw = (elapsed: number) => {
      const spinT = Math.min(1, Math.max(0, (elapsed - INTRO_MS) / spinMs));
      const rotation = startRotation + (endRotation - startRotation) * easeCubicBezier(spinT, SPIN_EASING);
      const revealT = Math.max(0, (elapsed - revealAt) / REVEAL_MS);
      drawWinnerFrame(ctx, canvas.width, canvas.height, scene, {
        rotation,
        reveal: Math.min(1, revealT),
        confettiTime: Math.max(0, (elapsed - revealAt) / 1000),
      });
    };
    draw(0);

    const stream = canvas.captureStream(CLIP_FPS);
    const audio = this.cfg.soundEnabled() ? await this.createClipAudio() : null;
    audio?.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

    const recorder = new MediaRecorder(stream, {
      mimeType: this.clipMimeType,
      videoBitsPerSecond: CLIP_BITRATE,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    recorder.start(250);
    const startedAt = performance.now();
    let spinSoundStarted = false;
    let winnerSoundStarted = false;

    await new Promise<void>((resolve) => {
      const frame = () => {
        const elapsed = performance.now() - startedAt;
        if (signal.aborted || elapsed >= totalMs) {
          resolve();
          return;
        }

        if (audio && !spinSoundStarted && elapsed >= INTRO_MS) {
          spinSoundStarted = true;
          audio.playSpin(startRotation, endRotation, spinMs, scene.sliceCount);
        }
        if (audio && !winnerSoundStarted && elapsed >= revealAt) {
          winnerSoundStarted = true;
          audio.playWinner();
        }

        draw(elapsed);
        onProgress(elapsed / totalMs);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    audio?.close();

    if (signal.aborted || !chunks.length) return null;
    onProgress(1);

    const type = this.clipMimeType.split(';')[0];
    const extension = type === 'video/mp4' ? 'mp4' : 'webm';
    return {
      blob: new Blob(chunks, { type }),
      filename: `${this.fileStem(scene.winner)}.${extension}`,
    };
  }

  /** Opens the share sheet where that is the natural move, otherwise downloads. */
  async shareOrDownload(file: WinnerClip): Promise<ShareOutcome> {
    const title = $localize`:@@share.title:Winner: ${this.cfg.winner() ?? ''}:NAME:`;

    if (this.native.isNative) {
      return this.shareNative(file, title);
    }

    if (this.prefersShareSheet) {
      const shared = new File([file.blob], file.filename, { type: file.blob.type });
      if (navigator.canShare?.({ files: [shared] })) {
        try {
          await navigator.share({ files: [shared], title });
          return 'shared';
        } catch (error) {
          if ((error as { name?: string }).name === 'AbortError') return 'cancelled';
          // NotAllowedError: the tap that started this is too old (a clip
          // takes seconds to record). Saving the file still gets it out.
        }
      }
    }

    this.download(file);
    return 'downloaded';
  }

  download(file: WinnerClip): void {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /**
   * The WebView has no Web Share for files, so the file goes to the app's
   * cache directory first and the Capacitor share sheet gets its URI.
   */
  private async shareNative(file: WinnerClip, title: string): Promise<ShareOutcome> {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);

    const written = await Filesystem.writeFile({
      path: file.filename,
      data: await blobToBase64(file.blob),
      directory: Directory.Cache,
    });

    try {
      await Share.share({ title, files: [written.uri], dialogTitle: title });
      return 'shared';
    } catch {
      // The plugin rejects when the user closes the sheet without picking an app.
      return 'cancelled';
    }
  }

  private buildScene(rotation?: number): Promise<WinnerScene | null> {
    const date = new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(new Date());
    return buildWinnerScene(
      this.cfg,
      { winner: $localize`:@@winner.label:Winner`, date },
      rotation,
    );
  }

  /**
   * An audio graph whose output is recorded instead of played: the clip gets
   * the user's uploaded sounds when there are any, the synthesised ticks and
   * fanfare otherwise, just like the live spin.
   */
  private async createClipAudio(): Promise<ClipAudio | null> {
    if (typeof AudioContext === 'undefined') return null;

    const context = new AudioContext();
    await context.resume().catch(() => {});
    const destination = context.createMediaStreamDestination();
    const defaults = new DefaultSoundPlayer({ context, destination });
    const [customSpin, customWinner] = await Promise.all([
      decodeAudio(context, this.cfg.customAudio()),
      decodeAudio(context, this.cfg.winnerAudio()),
    ]);

    const playBuffer = (buffer: AudioBuffer, maxSeconds?: number) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      source.start();
      if (maxSeconds) source.stop(context.currentTime + maxSeconds);
    };

    return {
      stream: destination.stream,
      playSpin: (from, to, durationMs, slices) =>
        customSpin ? playBuffer(customSpin, durationMs / 1000) : defaults.playSpin(from, to, durationMs, slices),
      playWinner: () => (customWinner ? playBuffer(customWinner) : defaults.playWinner()),
      close: () => void context.close().catch(() => {}),
    };
  }

  private fileStem(winner: string): string {
    const slug = winner
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return slug ? `wheelr-winner-${slug}` : 'wheelr-winner';
  }
}

interface ClipAudio {
  stream: MediaStream;
  playSpin(fromDeg: number, toDeg: number, durationMs: number, sliceCount: number): void;
  playWinner(): void;
  close(): void;
}

function pickClipMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  return CLIP_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

async function decodeAudio(context: AudioContext, dataUrl: string): Promise<AudioBuffer | null> {
  if (!dataUrl) return null;
  try {
    const bytes = await (await fetch(dataUrl)).arrayBuffer();
    return await context.decodeAudioData(bytes);
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
