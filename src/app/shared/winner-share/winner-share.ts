import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { WinnerShareService, type WinnerClip } from '../../services/winner-share.service';

type ClipState = 'idle' | 'recording' | 'ready' | 'error';

/**
 * "Share image" and "Create video clip" under the winner card. The clip is
 * recorded first and shared on a second tap: recording takes several seconds,
 * longer than a browser keeps the original tap valid for `navigator.share`.
 */
@Component({
  selector: 'wl-winner-share',
  templateUrl: './winner-share.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnerShare {
  private readonly cfg = inject(WheelConfigurator);
  protected readonly share = inject(WinnerShareService);

  protected readonly imageBusy = signal(false);
  protected readonly imageError = signal(false);
  protected readonly clipState = signal<ClipState>('idle');
  protected readonly clipProgress = signal(0);
  private readonly clip = signal<WinnerClip | null>(null);
  private abort: AbortController | null = null;

  protected readonly useShareSheet = this.share.prefersShareSheet;

  protected readonly recordingLabel = computed(() => {
    const percent = Math.round(this.clipProgress() * 100);
    return $localize`:@@share.clip.recording:Recording clip… ${percent}:PERCENT:%`;
  });

  constructor() {
    // A new spin or a dismissed card makes any clip in progress (or ready) stale.
    effect(() => {
      this.cfg.winner();
      untracked(() => this.reset());
    });
    inject(DestroyRef).onDestroy(() => this.abort?.abort());
  }

  async shareImage(): Promise<void> {
    if (this.imageBusy()) return;
    this.imageBusy.set(true);
    this.imageError.set(false);
    try {
      const image = await this.share.renderImage();
      if (!image) {
        this.imageError.set(true);
        return;
      }
      await this.share.shareOrDownload(image);
    } catch {
      this.imageError.set(true);
    } finally {
      this.imageBusy.set(false);
    }
  }

  async createClip(): Promise<void> {
    if (this.clipState() === 'recording') return;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    this.clip.set(null);
    this.clipProgress.set(0);
    this.clipState.set('recording');

    try {
      const clip = await this.share.recordClip((p) => this.clipProgress.set(p), abort.signal);
      if (abort.signal.aborted) return;
      this.clip.set(clip);
      this.clipState.set(clip ? 'ready' : 'error');
    } catch {
      if (!abort.signal.aborted) this.clipState.set('error');
    }
  }

  async shareClip(): Promise<void> {
    const clip = this.clip();
    if (!clip) return;
    try {
      await this.share.shareOrDownload(clip);
    } catch {
      this.clipState.set('error');
    }
  }

  downloadClip(): void {
    const clip = this.clip();
    if (clip) this.share.download(clip);
  }

  private reset(): void {
    this.abort?.abort();
    this.abort = null;
    this.clip.set(null);
    this.clipProgress.set(0);
    this.clipState.set('idle');
    this.imageError.set(false);
  }
}
