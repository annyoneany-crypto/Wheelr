import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdsService } from '../../services/ads.service';
import { NativePlatformService } from '../../services/native-platform.service';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { drawWheelCanvas } from '../../shared/extraction-effect/wheel-renderer';
import { WHEEL_TEMPLATES, WheelTemplateItem } from './wheel-templates.data';

@Component({
  selector: 'app-wheel-templates',
  imports: [RouterLink],
  templateUrl: './wheel-templates.html',
  styleUrl: './wheel-templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelTemplates {
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly nativePlatform = inject(NativePlatformService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ads = inject(AdsService);
  private readonly router = inject(Router);

  protected readonly templates = WHEEL_TEMPLATES;
  protected readonly copyingTemplateId = signal<string | null>(null);

  /** In the Android app a template is unlocked by watching a rewarded ad. */
  protected readonly adsRequired = this.ads.isEnabled;

  /** Template waiting behind the "watch an ad" prompt, if any. */
  protected readonly pendingTemplate = signal<WheelTemplateItem | null>(null);
  protected readonly adPlaying = signal(false);
  /** Shown when the user closed the ad early and the template stayed locked. */
  protected readonly lockedNotice = signal<string | null>(null);

  private readonly previewCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('previewCanvas');

  constructor() {
    afterNextRender(() => this.drawPreviews());

    // The prompt is a signal, not a route, so Android's back press needs telling.
    this.destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => this.dismissAdPrompt()),
    );
  }

  private drawPreviews(): void {
    this.previewCanvases().forEach((canvasRef, index) => {
      const template = this.templates[index];
      if (!template) {
        return;
      }

      const canvas = canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      drawWheelCanvas(canvas, ctx, {
        names: template.names,
        colors: template.palette.colors,
        fontFamily: '"Inter", sans-serif',
        radiusInset: 6,
      });
    });
  }

  /**
   * On the web this copies straight away, exactly as before. In the app it opens
   * the rewarded-ad prompt first — AdMob requires the user to be told what they
   * are getting before a rewarded ad starts, so the ad never plays on this tap.
   */
  protected requestTemplate(template: WheelTemplateItem): void {
    if (this.copyingTemplateId() || this.adPlaying()) {
      return;
    }

    this.lockedNotice.set(null);

    if (!this.adsRequired) {
      void this.copyTemplate(template);
      return;
    }

    this.pendingTemplate.set(template);
  }

  /** "Watch the ad" in the prompt. */
  protected async confirmWatchAd(): Promise<void> {
    const template = this.pendingTemplate();
    if (!template || this.adPlaying()) {
      return;
    }

    this.adPlaying.set(true);
    try {
      const outcome = await this.ads.showRewardedAd();

      if (outcome === 'skipped') {
        this.lockedNotice.set(
          'The ad has to play all the way through to unlock this template. Give it another go.',
        );
        return;
      }

      // 'rewarded' unlocks it; 'unavailable' means no ad could be loaded at all
      // (offline, no fill) and we let the user through rather than stranding them.
      this.pendingTemplate.set(null);
      await this.copyTemplate(template);
    } finally {
      this.adPlaying.set(false);
    }
  }

  /** Returns true when the prompt was open and got closed. */
  protected dismissAdPrompt(): boolean {
    // Closing mid-ad would desync the prompt from the fullscreen ad on top of it.
    if (!this.pendingTemplate() || this.adPlaying()) {
      return false;
    }

    this.pendingTemplate.set(null);
    this.lockedNotice.set(null);
    return true;
  }

  private async copyTemplate(template: WheelTemplateItem): Promise<void> {
    this.copyingTemplateId.set(template.id);
    try {
      await this.wheelConfigurator.createWheelWorkspaceFromTemplate(template);
      await this.router.navigate(['/']);
    } finally {
      this.copyingTemplateId.set(null);
    }
  }
}
