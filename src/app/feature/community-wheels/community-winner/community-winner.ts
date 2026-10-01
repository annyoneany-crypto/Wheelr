import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NativePlatformService } from '../../../services/native-platform.service';
import type { WinnerShareSource } from '../../../services/winner-share.service';
import { WinnerShare } from '../../../shared/winner-share/winner-share';

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

/** Seconds between two bursts of sparks from the centre. */
const BURST_EVERY_S = 1.1;
/**
 * Spawn by time and cap the totals: spawning per frame piled up thousands of
 * particles on slow devices (a long frame is clamped to 50 ms, so particles
 * outlive more frames), and the page stopped responding to the Close button.
 */
const EMBERS_PER_SECOND = 70;
const MAX_EMBERS = 200;
const MAX_SPARKS = 450;

/**
 * The winner reveal of a community wheel: a spirit fire in the wheel's own
 * palette (embers rising from the bottom, bursts of sparks from the centre)
 * behind the same card and actions as the main wheel's `FireEffect`.
 *
 * `FireEffect` itself cannot be reused: it reads and writes `WheelConfigurator`
 * (winner, names, animation id), and a community wheel must never touch the
 * visitor's own wheels. This one only emits; the page owns the entries.
 */
@Component({
  selector: 'wl-community-winner',
  imports: [WinnerShare],
  templateUrl: './community-winner.html',
  styleUrl: './community-winner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityWinner {
  private readonly destroyRef = inject(DestroyRef);
  private readonly nativePlatform = inject(NativePlatformService);

  readonly winner = input.required<string>();
  readonly colors = input.required<readonly string[]>();
  readonly accent = input.required<string>();
  /** Image and clip of this draw; without it the share buttons are hidden. */
  readonly share = input<WinnerShareSource | null>(null);

  readonly closed = output<void>();
  readonly removeOne = output<void>();
  readonly removeAll = output<void>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('effectCanvas');
  private frameId: number | null = null;

  constructor() {
    // A modal made of signals: Android's back press has to be told to close it.
    this.destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => {
        this.closed.emit();
        return true;
      })
    );

    afterNextRender(() => this.start());
    this.destroyRef.onDestroy(() => {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
      }
    });
  }

  private start(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', resize));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette = [...this.colors(), this.accent(), '#fff4d6'];
    const pick = () => palette[Math.floor(Math.random() * palette.length)];

    const embers: Ember[] = [];
    const sparks: Spark[] = [];
    let last = performance.now();
    let sinceBurst = 0;
    let emberDebt = 0;

    const burst = (count: number) => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (let i = 0; i < count && sparks.length < MAX_SPARKS; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 520;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: 1.5 + Math.random() * 3,
          color: pick(),
        });
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      // The glow of the fire along the bottom edge, in the accent colour.
      const glow = ctx.createLinearGradient(0, height, 0, height * 0.55);
      glow.addColorStop(0, `${this.accent()}55`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      emberDebt += dt * (reducedMotion ? EMBERS_PER_SECOND / 6 : EMBERS_PER_SECOND);
      for (; emberDebt >= 1; emberDebt -= 1) {
        if (embers.length >= (reducedMotion ? 40 : MAX_EMBERS)) {
          continue;
        }
        const maxLife = 1.6 + Math.random() * 1.8;
        embers.push({
          x: Math.random() * width,
          y: height + 10,
          vx: (Math.random() - 0.5) * 40,
          vy: -(70 + Math.random() * 170),
          life: maxLife,
          maxLife,
          size: 1.5 + Math.random() * 3.5,
          color: pick(),
        });
      }

      sinceBurst += dt;
      if (sinceBurst >= BURST_EVERY_S) {
        sinceBurst = 0;
        burst(reducedMotion ? 30 : 110);
      }

      ctx.globalCompositeOperation = 'lighter';

      for (let i = embers.length - 1; i >= 0; i -= 1) {
        const ember = embers[i];
        ember.life -= dt;
        if (ember.life <= 0) {
          embers.splice(i, 1);
          continue;
        }
        // A little sway, like a flame licking upwards.
        ember.vx += Math.sin((now / 300) + ember.y / 60) * 12 * dt;
        ember.x += ember.vx * dt;
        ember.y += ember.vy * dt;

        const alpha = ember.life / ember.maxLife;
        drawGlowDot(ctx, ember.x, ember.y, ember.size * (0.6 + alpha * 0.6), ember.color, alpha);
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.life -= dt * 0.7;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        spark.vx *= 1 - 1.4 * dt;
        spark.vy = spark.vy * (1 - 1.4 * dt) + 60 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;

        drawGlowDot(ctx, spark.x, spark.y, spark.size, spark.color, spark.life);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this.frameId = requestAnimationFrame(frame);
    };

    // Opening blast: the reveal should land with a bang, not build up to one.
    burst(reducedMotion ? 60 : 260);
    this.frameId = requestAnimationFrame(frame);
  }
}

/**
 * A dot with a soft halo. Two plain fills instead of `shadowBlur`, which blurs
 * every particle separately and is what made the effect expensive.
 */
function drawGlowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number
): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.16;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
