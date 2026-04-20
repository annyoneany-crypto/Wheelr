import { Component, ElementRef, inject, viewChild, effect } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'wl-linear-wheel',
  imports: [],
  templateUrl: './linear-wheel.html',
  styleUrl: './linear-wheel.css',
  host: {
    class: 'w-full',
  }
})
export class LinearWheel {
  wheelConfigurator = inject(WheelConfigurator);

  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private itemWidth = 200;
  private offset = 0;
  private velocity = 0;
  private isDecelerating = false;
  private spinTimeout: number | null = null;
  private resizeListener?: () => void;

  private colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  ngAfterViewInit() {
    this.initCanvas();
    effect(() => {
      this.wheelConfigurator.fontFamily();
      this.updateFont();
    });

    const onResize = () => this.initCanvas();
    window.addEventListener('resize', onResize);
    this.resizeListener = () => window.removeEventListener('resize', onResize);

    this.scheduleFrame();
  }

  ngOnDestroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.spinTimeout !== null) {
      clearTimeout(this.spinTimeout);
      this.spinTimeout = null;
    }
    if (this.resizeListener) {
      this.resizeListener();
      this.resizeListener = undefined;
    }
  }

  private initCanvas() {
    const canvas = this.canvasRef()!.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.updateFont();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  private updateFont() {
    if (!this.ctx) return;
    const ff = this.wheelConfigurator.fontFamily() || '"Inter", sans-serif';
    this.ctx.font = `bold 24px ${ff}`;
  }

  private draw() {
    if (!this.ctx) return;

    const canvas = this.canvasRef()!.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    this.ctx.clearRect(0, 0, width, height);

    const list = this.wheelConfigurator.names();
    if (list.length === 0) return;

    if (this.wheelConfigurator.isSpinning()) {
      this.offset += this.velocity;

      if (this.isDecelerating) {
        this.velocity *= 0.985;

        if (this.velocity < 0.1) {
          this.velocity = 0;
          this.wheelConfigurator.isSpinning.set(false);
          this.isDecelerating = false;
          this.snapToNearest();
        }
      }
    }

    const centerX = width / 2;
    const currentVirtualIndex = Math.floor(this.offset / this.itemWidth);
    const halfVisible = Math.ceil((width / this.itemWidth) / 2) + 2;
    const padding = 5;

    for (let i = currentVirtualIndex - halfVisible; i <= currentVirtualIndex + halfVisible; i++) {
      const index = ((i % list.length) + list.length) % list.length;
      const renderX = (i * this.itemWidth) - this.offset + centerX - (this.itemWidth / 2);

      this.ctx.fillStyle = this.colors[index % this.colors.length];
      this.ctx.fillRect(renderX + padding, 10, this.itemWidth - (padding * 2), height - 20);

      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(renderX + padding, 10, this.itemWidth - (padding * 2), height - 20);

      const distFromCenter = Math.abs((renderX + this.itemWidth / 2) - centerX);
      if (distFromCenter < (this.itemWidth / 2)) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.18)';
        this.ctx.fillRect(renderX + padding, 10, this.itemWidth - (padding * 2), height - 20);
      }

      this.ctx.fillStyle = 'white';
      const text = list[index];
      const textToDraw = this.ctx.measureText(text).width > (this.itemWidth - 20)
        ? text.substring(0, 10) + '..'
        : text;
      this.ctx.fillText(textToDraw, renderX + (this.itemWidth / 2), height / 2);
    }

    if (this.wheelConfigurator.isSpinning()) {
      this.animationId = requestAnimationFrame(() => this.draw());
    } else {
      this.animationId = null;
    }
  }

  private scheduleFrame(): void {
    if (this.animationId === null) {
      this.animationId = requestAnimationFrame(() => this.draw());
    }
  }

  spin() {
    if (this.wheelConfigurator.isSpinning() || this.wheelConfigurator.names().length < 2) return;

    this.wheelConfigurator.winner.set(null);
    this.wheelConfigurator.isSpinning.set(true);
    this.isDecelerating = false;
    this.velocity = 50 + Math.random() * 20;

    this.scheduleFrame();

    if (this.spinTimeout !== null) {
      clearTimeout(this.spinTimeout);
    }
    this.spinTimeout = window.setTimeout(() => {
      this.isDecelerating = true;
      this.spinTimeout = null;
    }, 1000 + Math.random() * 1000);
  }

  private snapToNearest() {
    const totalWidth = this.wheelConfigurator.names().length * this.itemWidth;
    let currentPos = this.offset % totalWidth;
    if (currentPos < 0) currentPos += totalWidth;

    const winningIndex = Math.round(currentPos / this.itemWidth) % this.wheelConfigurator.names().length;
    const targetOffset = winningIndex * this.itemWidth;
    const rounds = Math.floor(this.offset / totalWidth);
    this.offset = (rounds * totalWidth) + targetOffset;

    const winnerName = this.wheelConfigurator.names()[winningIndex];
    this.wheelConfigurator.winner.set(winnerName);
  }
}
