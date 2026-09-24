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

/**
 * The premium wheel: the same canvas as the classic `Wheel`, set in a CSS 3D
 * scene — tilted towards the viewer, with a solid gold rim, a bezel of chasing
 * bulbs, pegs that turn with the slices, a domed hub and a pointer that flicks
 * every time a peg passes under it.
 *
 * Only the presentation differs. The winner is still read by the service from
 * `currentRotation`, and tilting around the horizontal axis keeps the top of the
 * wheel at the top, so the pointer marks exactly the slice the service picks.
 *
 * Unlike the classic wheel it does not zoom into the winner on large lists: a
 * scale transform inside a perspective scene sends the wheel through the camera.
 */
@Component({
  selector: 'wl-wheel-3d',
  imports: [],
  templateUrl: './wheel-3d.html',
  styleUrl: './wheel-3d.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'calculateSize()',
  },
})
export class Wheel3d {
  protected readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** No winner zoom here, so a retina-sharp backing store is enough (the classic one uses 7x). */
  protected readonly renderScale = 3;
  /** Discs stacked behind the face to give the wheel its visible thickness. */
  protected readonly edgeLayers = Array.from({ length: 14 }, (_, index) => index);
  protected readonly bulbs = Array.from({ length: 24 }, (_, index) => index);
  /** Above this many slices the pegs would merge into a solid ring. */
  private readonly MAX_PEGS = 60;
  /** Minimum gap between two pointer flicks, so hundreds of slices do not blur into a buzz. */
  private readonly MIN_TICK_INTERVAL_MS = 55;

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');
  private readonly pointerRef = viewChild<ElementRef<HTMLElement>>('pointer');

  /** Diameter of the painted face; the bezel is added around it. */
  protected readonly size = signal(640);
  protected readonly rim = computed(() => Math.round(this.size() * 0.07));
  protected readonly outerSize = computed(() => this.size() + this.rim() * 2);

  protected readonly hubSize = computed(
    () => HUB_SIZE_PX[this.wheelConfigurator.centerLogoSize()] ?? HUB_SIZE_PX['m'],
  );

  protected readonly pegs = computed(() => {
    const count = this.wheelConfigurator.names().length;
    if (count < 2 || count > this.MAX_PEGS) {
      return [];
    }

    return Array.from({ length: count }, (_, index) => (index * 360) / count);
  });

  protected readonly rotationTransform = computed(
    () => `rotate(${this.wheelConfigurator.currentRotation()}deg)`,
  );

  protected readonly rotationDuration = computed(() =>
    this.wheelConfigurator.isSpinning() ? `${this.wheelConfigurator.spinDurationMs()}ms` : '100ms',
  );

  protected readonly rotationEasing = computed(() =>
    this.wheelConfigurator.isSpinning() ? 'cubic-bezier(0.15, 0, 0.15, 1)' : 'linear',
  );

  /** Same geometry as the classic wheel's winner outline, in face coordinates. */
  protected readonly winnerSlicePath = computed(() => {
    const count = this.wheelConfigurator.names().length;
    if (!count) {
      return '';
    }

    const size = this.size();
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

    this.size();
    this.wheelConfigurator.names();
    this.wheelConfigurator.selectedPalette();
    this.wheelConfigurator.fontFamily();
    this.wheelConfigurator.fontRenderVersion();
    this.wheelConfigurator.imageRenderVersion();

    this.scheduleDraw(canvasElement, context);

    // Kept in step with the classic wheel for service consumers of the primary canvas.
    this.wheelConfigurator.ctx.set(context);
    this.wheelConfigurator.canvasRef.set(this.canvasRef()!);
  });

  private readonly pointerTickEffect = effect(() => {
    if (!this.isBrowser) {
      return;
    }

    if (this.wheelConfigurator.isSpinning()) {
      untracked(() => this.startPointerTicks());
    } else {
      this.stopPointerTicks();
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
    this.stopPointerTicks();
  }

  protected spin(): void {
    this.wheelConfigurator.spinWheel();
  }

  /** Transform for bulb `index`, spread evenly around the bezel. */
  protected bulbTransform(index: number): string {
    const radius = this.outerSize() / 2 - this.rim() / 2;
    return `rotate(${(index * 360) / this.bulbs.length}deg) translateY(${-radius}px)`;
  }

  /** Transform for a peg sitting on the slice boundary at `angle` (0 = 3 o'clock, like the canvas). */
  protected pegTransform(angle: number): string {
    return `rotate(${angle}deg) translateX(${this.size() / 2 - this.size() * 0.028}px)`;
  }

  calculateSize(): void {
    if (!this.isBrowser) {
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 1024;
    const usableWidth = viewportWidth - (isMobile ? 32 : 180);
    const usableHeight = viewportHeight - (isMobile ? 200 : 260);
    // The bezel adds 14% around the face; the tilt gives back a little height.
    const fit = Math.min(usableWidth, usableHeight / 0.95) / 1.14;

    this.size.set(Math.max(200, Math.min(680, Math.floor(fit))));
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
   * Follows the CSS transition frame by frame and flicks the pointer whenever a
   * new slice passes under it. The rotation is read back from the computed
   * transform because the service only knows the start and end angles.
   */
  private startPointerTicks(): void {
    this.stopPointerTicks();

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
      // The pointer sits at 270° in canvas space once the rotation is undone.
      const underPointer = (((270 - rotation) % 360) + 360) % 360;
      const slice = Math.floor(underPointer / (360 / count));

      if (slice !== lastSlice) {
        if (lastSlice !== -1 && now - lastTickAt >= this.MIN_TICK_INTERVAL_MS) {
          lastTickAt = now;
          this.flickPointer();
        }
        lastSlice = slice;
      }
    };

    this.tickFrameId = requestAnimationFrame(step);
  }

  private stopPointerTicks(): void {
    if (this.tickFrameId !== null) {
      cancelAnimationFrame(this.tickFrameId);
      this.tickFrameId = null;
    }
  }

  private flickPointer(): void {
    this.pointerRef()?.nativeElement.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 140, easing: 'ease-out' },
    );
  }
}
