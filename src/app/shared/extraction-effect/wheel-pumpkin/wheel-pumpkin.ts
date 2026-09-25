import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

/** Pixel size of the centre hub for each `centerLogoSize`, matching the classic wheel. */
const HUB_SIZE_PX: Record<string, number> = { s: 56, m: 80, l: 96, xl: 112, xxl: 144, xxxl: 192 };

/*
 * Pumpkin geometry, as fractions of the pumpkin's width. The SVG body is drawn
 * in a 100 × 90 box, so these are also its viewBox units divided by 100.
 */
const BODY_HEIGHT = 0.9;
/** Centre of the carved mouth, measured from the top-left of the body. */
const MOUTH_X = 0.5;
const MOUTH_Y = 0.52;
const MOUTH_RADIUS = 0.325;
/** The wheel sits inside the mouth, leaving a ring of gum for the teeth. */
const WHEEL_TO_MOUTH = 0.86;
const TOOTH_COUNT = 18;

interface Tooth {
  angle: number;
  /** Length as a fraction of the gum ring, so neighbours differ and the grin looks carved. */
  length: number;
  width: number;
}

/**
 * The Halloween premium wheel: a carved jack-o'-lantern whose round mouth holds
 * the wheel, ringed with teeth, with a fang at the top as the pointer.
 *
 * Like `Wheel3d` only the presentation differs: the canvas is the same one the
 * classic wheel draws, and the winner is still read by the service from
 * `currentRotation`. The wheel turns only in its own plane and the fang sits on
 * its vertical axis, so the 3D sway never moves which slice the fang marks.
 */
@Component({
  selector: 'wl-wheel-pumpkin',
  imports: [],
  templateUrl: './wheel-pumpkin.html',
  styleUrl: './wheel-pumpkin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'calculateSize()',
  },
})
export class WheelPumpkin {
  protected readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly renderScale = 3;
  /** Copies of the body stacked behind it: the pumpkin's visible depth as it sways. */
  protected readonly depthLayers = Array.from({ length: 10 }, (_, index) => index);
  private readonly MIN_TICK_INTERVAL_MS = 55;

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');
  private readonly fangRef = viewChild<ElementRef<HTMLElement>>('fang');

  /** Width of the pumpkin body; everything else is derived from it. */
  protected readonly width = signal(760);
  protected readonly height = computed(() => Math.round(this.width() * BODY_HEIGHT));
  protected readonly mouthSize = computed(() => Math.round(this.width() * MOUTH_RADIUS * 2));
  protected readonly wheelSize = computed(() => Math.round(this.mouthSize() * WHEEL_TO_MOUTH));
  protected readonly mouthLeft = computed(() => Math.round(this.width() * MOUTH_X - this.mouthSize() / 2));
  protected readonly mouthTop = computed(() => Math.round(this.width() * MOUTH_Y - this.mouthSize() / 2));

  protected readonly hubSize = computed(() =>
    Math.min(
      HUB_SIZE_PX[this.wheelConfigurator.centerLogoSize()] ?? HUB_SIZE_PX['m'],
      Math.round(this.wheelSize() * 0.32),
    ),
  );

  /**
   * Teeth around the mouth, in the mouth's own 100 × 100 box. The top one is
   * left out: the fang (the pointer) takes its place.
   */
  protected readonly teeth: Tooth[] = Array.from({ length: TOOTH_COUNT }, (_, index) => ({
    angle: (index * 360) / TOOTH_COUNT,
    length: index % 3 === 0 ? 1.25 : index % 2 === 0 ? 0.85 : 1.05,
    width: index % 2 === 0 ? 8.5 : 7,
  })).filter((tooth) => tooth.angle !== 0);

  protected readonly rotationTransform = computed(
    () => `rotate(${this.wheelConfigurator.currentRotation()}deg)`,
  );

  protected readonly rotationDuration = computed(() =>
    this.wheelConfigurator.isSpinning() ? `${this.wheelConfigurator.spinDurationMs()}ms` : '100ms',
  );

  protected readonly rotationEasing = computed(() =>
    this.wheelConfigurator.isSpinning() ? 'cubic-bezier(0.15, 0, 0.15, 1)' : 'linear',
  );

  /** A winner was just picked: the teeth snap shut once (see `.wlp-chomp`). */
  protected readonly chomping = computed(
    () => !!this.wheelConfigurator.winner() && !this.wheelConfigurator.isSpinning(),
  );

  /** Same geometry as the classic wheel's winner outline, in wheel coordinates. */
  protected readonly winnerSlicePath = computed(() => {
    const count = this.wheelConfigurator.names().length;
    if (!count) {
      return '';
    }

    const size = this.wheelSize();
    const center = size / 2;
    const radius = center - 2;
    const sliceAngle = (Math.PI * 2) / count;
    const rotation = this.wheelConfigurator.currentRotation() * (Math.PI / 180);
    const start = this.wheelConfigurator.pointerSliceIndex() * sliceAngle + rotation;
    const end = start + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    return (
      `M ${center} ${center} ` +
      `L ${center + radius * Math.cos(start)} ${center + radius * Math.sin(start)} ` +
      `A ${radius} ${radius} 0 ${largeArc} 1 ${center + radius * Math.cos(end)} ${center + radius * Math.sin(end)} Z`
    );
  });

  private drawFrameId: number | null = null;
  private tickFrameId: number | null = null;

  private readonly syncCanvasEffect = effect(() => {
    if (!this.isBrowser) {
      return;
    }

    const canvasElement = this.canvasRef()?.nativeElement;
    const context = canvasElement?.getContext('2d');
    if (!canvasElement || !context) {
      return;
    }

    this.wheelSize();
    this.wheelConfigurator.names();
    this.wheelConfigurator.selectedPalette();
    this.wheelConfigurator.fontFamily();
    this.wheelConfigurator.fontRenderVersion();
    this.wheelConfigurator.imageRenderVersion();

    this.scheduleDraw(canvasElement, context);

    // Kept in step with the other views for service consumers of the primary canvas.
    this.wheelConfigurator.ctx.set(context);
    this.wheelConfigurator.canvasRef.set(this.canvasRef()!);
  });

  private readonly fangTickEffect = effect(() => {
    if (!this.isBrowser) {
      return;
    }

    if (this.wheelConfigurator.isSpinning()) {
      untracked(() => this.startFangTicks());
    } else {
      this.stopFangTicks();
    }
  });

  private readonly syncSizeEffect = effect(() => {
    this.wheelConfigurator.visibleWheelCount();
    untracked(() => this.calculateSize());
  });

  ngOnDestroy(): void {
    if (this.drawFrameId !== null) {
      cancelAnimationFrame(this.drawFrameId);
      this.drawFrameId = null;
    }
    this.stopFangTicks();
  }

  protected spin(): void {
    this.wheelConfigurator.spinWheel();
  }

  /** SVG `points` for one tooth: a triangle rooted in the gum, pointing at the centre. */
  protected toothPoints(tooth: Tooth): string {
    const outer = 50;
    const gum = 50 * (1 - WHEEL_TO_MOUTH);
    const inner = outer - gum * tooth.length;
    const half = tooth.width / 2;
    // Drawn pointing down from the top of the box, then rotated into place by the template.
    return `${50 - half},${50 - outer - 1} ${50 + half},${50 - outer - 1} 50,${50 - inner}`;
  }

  calculateSize(): void {
    if (!this.isBrowser) {
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 1024;
    const usableWidth = viewportWidth - (isMobile ? 24 : 180);
    const usableHeight = viewportHeight - (isMobile ? 190 : 250);
    // The stem adds about 12% above the body.
    const fit = Math.min(usableWidth, usableHeight / (BODY_HEIGHT + 0.12));

    this.width.set(Math.max(260, Math.min(860, Math.floor(fit))));
  }

  private scheduleDraw(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
    if (this.drawFrameId !== null) {
      cancelAnimationFrame(this.drawFrameId);
    }

    this.drawFrameId = requestAnimationFrame(() => {
      this.drawFrameId = null;
      this.wheelConfigurator.drawWheelForCanvas(canvas, context, this.renderScale);
    });
  }

  /**
   * Follows the CSS transition frame by frame and flicks the fang whenever a new
   * slice passes under it — the same approach as the 3D wheel's pointer.
   */
  private startFangTicks(): void {
    this.stopFangTicks();

    let lastSlice = -1;
    let lastTickAt = 0;

    const step = (now: number) => {
      this.tickFrameId = requestAnimationFrame(step);

      const canvas = this.canvasRef()?.nativeElement;
      const count = this.wheelConfigurator.names().length;
      if (!canvas || count < 2) {
        return;
      }

      const matrix = new DOMMatrixReadOnly(getComputedStyle(canvas).transform);
      const rotation = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
      const underFang = (((270 - rotation) % 360) + 360) % 360;
      const slice = Math.floor(underFang / (360 / count));

      if (slice !== lastSlice) {
        if (lastSlice !== -1 && now - lastTickAt >= this.MIN_TICK_INTERVAL_MS) {
          lastTickAt = now;
          this.flickFang();
        }
        lastSlice = slice;
      }
    };

    this.tickFrameId = requestAnimationFrame(step);
  }

  private stopFangTicks(): void {
    if (this.tickFrameId !== null) {
      cancelAnimationFrame(this.tickFrameId);
      this.tickFrameId = null;
    }
  }

  private flickFang(): void {
    this.fangRef()?.nativeElement.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 140, easing: 'ease-out' },
    );
  }
}
