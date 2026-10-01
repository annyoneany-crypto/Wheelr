import { Injectable, LOCALE_ID, inject } from '@angular/core';
import { WheelConfigurator } from './wheel-configurator.service';
import { NativePlatformService } from './native-platform.service';
import { DefaultSoundPlayer, SPIN_EASING, easeCubicBezier } from './default-sounds';
import {
  buildWinnerScene,
  drawWinnerFrame,
  type WinnerScene,
  type WinnerSceneLabels,
} from '../shared/winner-share/winner-share-scene';

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
  /** For the share sheet's title. */
  winner: string;
}

/** The spin a clip replays, in CSS rotation degrees. */
export interface ReplaySpin {
  startRotation: number;
  endRotation: number;
  durationMs: number;
}

/**
 * One sound of the clip: the synthesised ticks (spin) or fanfare (winner) of
 * `DefaultSoundPlayer`, or an audio file — a data URL or a path — optionally
 * cut off when the spin ends, and played as `fallback` if it cannot be decoded.
 */
export type ClipSound =
  | { kind: 'ticks' }
  | { kind: 'fanfare' }
  | { kind: 'file'; src: string; clipToSpin?: boolean; fallback?: 'ticks' | 'fanfare' };

/**
 * Everything the image and the clip need from a wheel. The main wheel's comes
 * from `WheelConfigurator` (`wheelSource()`); a community wheel builds its own,
 * so sharing never reads or writes the visitor's wheels.
 */
export interface WinnerShareSource {
  winner: string;
  /** `rotation`, when given, is where the replayed spin ends. */
  buildScene(labels: WinnerSceneLabels, rotation?: number): Promise<WinnerScene | null>;
  /** The spin to replay; null makes up one that lands on the same slice. */
  replay: ReplaySpin | null;
  /** Spin length for a made-up replay. */
  fallbackSpinMs: number;
  /** The clip's soundtrack; null records it silent. */
  sounds: { spin: ClipSound | null; winner: ClipSound | null } | null;
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

  async renderImage(source: WinnerShareSource = this.wheelSource()): Promise<WinnerClip | null> {
    const scene = await source.buildScene(this.sceneLabels());
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
    return blob ? { blob, filename: `${this.fileStem(scene.winner)}.png`, winner: scene.winner } : null;
  }

  /**
   * Records the clip in real time (a canvas stream cannot be encoded faster
   * than it plays), so it takes as long as the clip lasts. `onProgress`
   * receives 0-1; aborting `signal` stops and discards the recording.
   */
  async recordClip(
    onProgress: (progress: number) => void,
    signal: AbortSignal,
    source: WinnerShareSource = this.wheelSource(),
  ): Promise<WinnerClip | null> {
    if (!this.canRecordClip || !this.clipMimeType) return null;

    const replay = source.replay;
    const scene = await source.buildScene(this.sceneLabels(), replay?.endRotation);
    if (!scene || signal.aborted) return null;

    // Without a recorded spin (e.g. a multi-wheel preview), replay a
    // plausible one that lands on the same slice.
    const endRotation = scene.finalRotation;
    const startRotation = replay?.startRotation ?? endRotation - 360 * 6 - 137;
    const spinMs = Math.min(MAX_SPIN_MS, Math.max(1500, replay?.durationMs ?? source.fallbackSpinMs));
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
    const audio = source.sounds ? await createClipAudio(source.sounds) : null;
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
      winner: scene.winner,
    };
  }

  /** Opens the share sheet where that is the natural move, otherwise downloads. */
  async shareOrDownload(file: WinnerClip): Promise<ShareOutcome> {
    const title = $localize`:@@share.title:Winner: ${file.winner}:NAME:`;

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

  /**
   * The main wheel, as `WheelConfigurator` has it now. The clip replays the
   * last spin only if it belongs to this wheel and this winner, and gets the
   * user's uploaded sounds when there are any, the synthesised ticks and
   * fanfare otherwise, just like the live spin.
   */
  private wheelSource(): WinnerShareSource {
    const cfg = this.cfg;
    const winner = cfg.winner() ?? '';
    const spin = cfg.lastSpin();
    const replay = spin && spin.winner === winner && spin.workspaceId === cfg.activeWheelId() ? spin : null;
    const spinAudio = cfg.customAudio();
    const winnerAudio = cfg.winnerAudio();

    return {
      winner,
      buildScene: (labels, rotation) => buildWinnerScene(cfg, labels, rotation),
      replay,
      fallbackSpinMs: cfg.spinDurationMs(),
      sounds: cfg.soundEnabled()
        ? {
            spin: spinAudio
              ? { kind: 'file', src: spinAudio, clipToSpin: true, fallback: 'ticks' }
              : { kind: 'ticks' },
            winner: winnerAudio
              ? { kind: 'file', src: winnerAudio, fallback: 'fanfare' }
              : { kind: 'fanfare' },
          }
        : null,
    };
  }

  private sceneLabels(): WinnerSceneLabels {
    return {
      winner: $localize`:@@winner.label:Winner`,
      date: new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(new Date()),
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

/** An audio graph whose output is recorded instead of played. */
async function createClipAudio(sounds: {
  spin: ClipSound | null;
  winner: ClipSound | null;
}): Promise<ClipAudio | null> {
  if (typeof AudioContext === 'undefined') return null;

  const context = new AudioContext();
  await context.resume().catch(() => {});
  const destination = context.createMediaStreamDestination();
  const defaults = new DefaultSoundPlayer({ context, destination });
  const [spinBuffer, winnerBuffer] = await Promise.all([
    sounds.spin?.kind === 'file' ? decodeAudio(context, sounds.spin.src) : null,
    sounds.winner?.kind === 'file' ? decodeAudio(context, sounds.winner.src) : null,
  ]);

  const playBuffer = (buffer: AudioBuffer, maxSeconds?: number) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start();
    if (maxSeconds) source.stop(context.currentTime + maxSeconds);
  };

  // A file that does not decode plays its fallback, or nothing.
  const spin = sounds.spin;
  const winner = sounds.winner;
  const spinKind = spin?.kind === 'file' ? (spinBuffer ? 'file' : spin.fallback) : spin?.kind;
  const winnerKind = winner?.kind === 'file' ? (winnerBuffer ? 'file' : winner.fallback) : winner?.kind;
  return {
    stream: destination.stream,
    playSpin: (from, to, durationMs, slices) => {
      if (spinKind === 'ticks') defaults.playSpin(from, to, durationMs, slices);
      else if (spinKind === 'file' && spinBuffer) {
        playBuffer(spinBuffer, spin?.kind === 'file' && spin.clipToSpin ? durationMs / 1000 : undefined);
      }
    },
    playWinner: () => {
      if (winnerKind === 'fanfare') defaults.playWinner();
      else if (winnerKind === 'file' && winnerBuffer) playBuffer(winnerBuffer);
    },
    close: () => void context.close().catch(() => {}),
  };
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
