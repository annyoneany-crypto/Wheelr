import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WheelCloudRepository } from '../../services/wheel-cloud-repository.service';
import { contrastForHex } from '../../services/global_function';
import { WheelDisplayConfig } from '../../services/wheel-configurator.models';

@Component({
  selector: 'app-public-wheel',
  templateUrl: './public-wheel.html',
  styleUrl: './public-wheel.css',
})
export class PublicWheel implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly cloudRepository = inject(WheelCloudRepository);

  readonly wheelCanvasRefs = viewChildren<ElementRef<HTMLCanvasElement>>('wheelCanvas');

  readonly wheelConfigs = signal<WheelDisplayConfig[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly wheelId = signal('');
  readonly wheelTitle = signal('');
  readonly wheelSubtitle = signal('');
  readonly idleRotationDeg = signal(0);

  private idleRafId: number | null = null;
  private idleLastTs = 0;

  readonly pageBgColor = computed(() => this.wheelConfigs()[0]?.bgColor || '#18181b');
  readonly pageBgImage = computed(() => this.wheelConfigs()[0]?.bgImage || '');

  readonly headingColor = computed(() => {
    const bgColor = this.pageBgColor();
    return contrastForHex(bgColor);
  });

  readonly subtitleColor = computed(() => {
    const headingColor = this.headingColor();
    return headingColor === '#FFFFFF' ? 'rgba(255,255,255,0.86)' : 'rgba(0,0,0,0.82)';
  });

  constructor() {
    effect(() => {
      this.wheelConfigs();
      this.wheelCanvasRefs();
      requestAnimationFrame(() => this.drawAllWheels());
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id')?.trim() ?? '';
      this.wheelId.set(id);
      void this.loadWheel(id);
    });
  }

  ngOnDestroy(): void {
    this.stopIdleRotation();
  }

  private async loadWheel(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.wheelConfigs.set([]);
    this.wheelTitle.set('');
    this.wheelSubtitle.set('');
    this.stopIdleRotation();

    if (!id) {
      this.error.set('Invalid wheel ID.');
      this.loading.set(false);
      return;
    }

    try {
      const publicData = await this.cloudRepository.getWheelDisplayConfigById(id);
      if (!publicData) {
        this.error.set('Wheel not found in cloud.');
        this.loading.set(false);
        return;
      }

      this.wheelTitle.set(publicData.title);
      this.wheelSubtitle.set(publicData.description);
      this.wheelConfigs.set(publicData.displayConfigs);
      this.startIdleRotation();
      requestAnimationFrame(() => this.drawAllWheels());
    } catch (error) {
      console.error('Error loading wheel from cloud:', error);
      this.error.set('Error loading wheel from cloud.');
    } finally {
      this.loading.set(false);
    }
  }

  private startIdleRotation(): void {
    this.stopIdleRotation();

    const degPerSecond = 4;
    this.idleLastTs = performance.now();

    const tick = (ts: number) => {
      const dt = (ts - this.idleLastTs) / 1000;
      this.idleLastTs = ts;

      this.idleRotationDeg.update((value) => value + degPerSecond * dt);
      this.idleRafId = requestAnimationFrame(tick);
    };

    this.idleRafId = requestAnimationFrame(tick);
  }

  private stopIdleRotation(): void {
    if (this.idleRafId !== null) {
      cancelAnimationFrame(this.idleRafId);
      this.idleRafId = null;
    }
  }

  centerSizeClass(config: WheelDisplayConfig): string {
    const size = config.centerLogoSize ?? 'm';

    if (size === 's') return 'w-14 h-14';
    if (size === 'l') return 'w-24 h-24';
    if (size === 'xl') return 'w-28 h-28';
    if (size === 'xxl') return 'w-36 h-36';
    if (size === 'xxxl') return 'w-48 h-48';
    return 'w-20 h-20';
  }

  centerTextColor(config: WheelDisplayConfig): '#000000' | '#FFFFFF' {
    return contrastForHex(config.centerColor || '#ffffff');
  }

  private drawAllWheels(): void {
    const configs = this.wheelConfigs();
    const canvases = this.wheelCanvasRefs();

    if (!configs.length || !canvases.length) {
      return;
    }

    const count = Math.min(configs.length, canvases.length);
    for (let i = 0; i < count; i += 1) {
      const canvas = canvases[i]?.nativeElement;
      const config = configs[i];
      if (!canvas || !config) {
        continue;
      }

      this.drawWheel(canvas, config);
    }
  }

  private drawWheel(canvas: HTMLCanvasElement, config: WheelDisplayConfig): void {
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const names = config.names ?? [];
    const colors = config.colors ?? [];

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!names.length) {
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 4, 0, Math.PI * 2);
      context.fillStyle = '#6b7280';
      context.fill();
      return;
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = canvas.width / 2 - 4;
    const sliceAngle = (Math.PI * 2) / names.length;

    for (let i = 0; i < names.length; i += 1) {
      const start = i * sliceAngle;
      const end = start + sliceAngle;
      const sliceColor = colors[i % Math.max(1, colors.length)] ?? '#f59e0b';

      context.beginPath();
      context.moveTo(cx, cy);
      context.arc(cx, cy, radius, start, end);
      context.closePath();
      context.fillStyle = sliceColor;
      context.fill();

      const mid = start + sliceAngle / 2;
      context.save();
      context.translate(cx, cy);
      context.rotate(mid);
      const labelColor = contrastForHex(sliceColor);
      const outlineColor = labelColor === '#FFFFFF' ? '#000000' : '#FFFFFF';

      context.fillStyle = labelColor;
      context.strokeStyle = `${outlineColor}AA`;
      context.lineWidth = 3;
      context.lineJoin = 'round';
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.font = `700 18px ${config.fontFamily || 'Inter, sans-serif'}`;
      context.strokeText(names[i] ?? '', radius - 20, 0);
      context.fillText(names[i] ?? '', radius - 20, 0);
      context.restore();
    }
  }
}
