import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import type { IWinnerEffect } from '../../../modules/interface/IWinnerEffect';
import type { effectType } from '../../../modules/classes/custom-type';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  temperature: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
}

interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface ApplauseHand {
  x: number;
  y: number;
  baseY: number;
  scale: number;
  phase: number;
  speed: number;
  color: string;
}

@Component({
  selector: 'wl-fire-effect',
  imports: [],
  templateUrl: './fire-effect.html',
  styleUrl: './fire-effect.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FireEffect implements IWinnerEffect {
  wheelConfigurator = inject(WheelConfigurator);

  effectType: effectType = 'fire';

  fireCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('fireCanvas');
  private fireParticles: FireParticle[] = [];
  private emberParticles: EmberParticle[] = [];
  private smokeParticles: SmokeParticle[] = [];
  private confettiPieces: ConfettiPiece[] = [];
  private fireworkSparks: FireworkSpark[] = [];
  private applauseHands: ApplauseHand[] = [];
  private lastBurstAt = 0;
  private fireFlickerPhase = 0;
  private starting = false;
  private resizeListener?: () => void;
  private readonly confettiColors = ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#f87171', '#fef08a'];
  private readonly fireworksColors = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#f97316', '#f5f5f5'];
  private readonly handColors = ['#f6d3b2', '#f2c09c', '#dca076', '#8d5524'];

  constructor() {
    effect(() => {
      const winner = this.wheelConfigurator.winner();
      const runningId = this.wheelConfigurator.winnerAnimationId();

      if (winner && !runningId && !this.starting) {
        this.starting = true;
        setTimeout(() => {
          this.starting = false;
          this.initAnimation();
        }, 50);
      }

      if (!winner && runningId) {
        cancelAnimationFrame(runningId);
        this.wheelConfigurator.winnerAnimationId.set(undefined);
      }
    });
  }

  ngOnDestroy(): void {
    const id = this.wheelConfigurator.winnerAnimationId();
    if (id) {
      cancelAnimationFrame(id);
      this.wheelConfigurator.winnerAnimationId.set(undefined);
    }
    if (this.resizeListener) {
      this.resizeListener();
      this.resizeListener = undefined;
    }
  }

  initAnimation(): void {
    const canvasRef = this.fireCanvasRef();
    if (!canvasRef) return;

    this.cancelRunningAnimation();
    this.effectType = this.wheelConfigurator.winnerEffect();

    const canvas = canvasRef.nativeElement;
    const fctx = canvas.getContext('2d');
    if (!fctx) return;

    this.resizeCanvas(canvas);
    if (this.resizeListener) {
      this.resizeListener();
    }
    const onResize = () => this.resizeCanvas(canvas);
    window.addEventListener('resize', onResize);
    this.resizeListener = () => window.removeEventListener('resize', onResize);

    this.fireParticles = [];
    this.emberParticles = [];
    this.smokeParticles = [];
    this.confettiPieces = [];
    this.fireworkSparks = [];
    this.applauseHands = [];
    this.lastBurstAt = performance.now();

    const animate = () => {
      fctx.clearRect(0, 0, canvas.width, canvas.height);

      if (this.effectType === 'confetti') {
        this.drawConfetti(fctx, canvas);
      } else if (this.effectType === 'fireworks') {
        this.drawFireworks(fctx, canvas);
      } else if (this.effectType === 'applause') {
        this.drawApplause(fctx, canvas);
      } else if (this.effectType === 'cartoon-fire') {
        this.drawCartoonFire(fctx, canvas);
      } else {
        this.drawFire(fctx, canvas);
      }

      fctx.globalAlpha = 1;
      fctx.shadowBlur = 0;
      this.wheelConfigurator.winnerAnimationId.set(requestAnimationFrame(animate));
    };

    animate();
  }

  winnerTitle(): string {
    if (this.effectType === 'confetti') {
      return 'Winner - Confetti Rain';
    }
    if (this.effectType === 'fireworks') {
      return 'Winner - Fireworks';
    }
    if (this.effectType === 'applause') {
      return 'Winner - Applause';
    }
    if (this.effectType === 'cartoon-fire') {
      return 'Winner - Cartoon Fire';
    }
    return 'Winner - Fire';
  }

  winnerBorderColor(): string {
    if (this.effectType === 'confetti') {
      return '#22d3ee';
    }
    if (this.effectType === 'fireworks') {
      return '#f472b6';
    }
    if (this.effectType === 'applause') {
      return '#a3e635';
    }
    if (this.effectType === 'cartoon-fire') {
      return '#fbbf24';
    }
    return '#f97316';
  }

  winnerBoxShadow(): string {
    if (this.effectType === 'confetti') {
      return '0 0 30px rgba(34,211,238,0.5)';
    }
    if (this.effectType === 'fireworks') {
      return '0 0 30px rgba(244,114,182,0.5)';
    }
    if (this.effectType === 'applause') {
      return '0 0 30px rgba(163,230,53,0.5)';
    }
    if (this.effectType === 'cartoon-fire') {
      return '0 0 30px rgba(251,191,36,0.6)';
    }
    return '0 0 30px rgba(249,115,22,0.6)';
  }

  winnerLabelColor(): string {
    if (this.effectType === 'confetti') {
      return '#67e8f9';
    }
    if (this.effectType === 'fireworks') {
      return '#f9a8d4';
    }
    if (this.effectType === 'applause') {
      return '#bef264';
    }
    if (this.effectType === 'cartoon-fire') {
      return '#fde68a';
    }
    return '#f97316';
  }

  resetWinner(): void {
    this.wheelConfigurator.resetWinnerEffect();
  }

  removeWinnerFromUsers(): void {
    const winner = this.wheelConfigurator.winner();
    if (!winner) {
      return;
    }

    const filteredNames = this.wheelConfigurator
      .names()
      .filter((name) => name !== winner);

    this.wheelConfigurator.setNames(filteredNames);
  }

  removeSingleWinnerEntryFromUsers(): void {
    const winner = this.wheelConfigurator.winner();
    if (!winner) {
      return;
    }

    const names = this.wheelConfigurator.names();
    const winnerIndex = names.indexOf(winner);
    if (winnerIndex < 0) {
      return;
    }

    const updatedNames = [...names];
    updatedNames.splice(winnerIndex, 1);
    this.wheelConfigurator.setNames(updatedNames);
  }

  private cancelRunningAnimation(): void {
    const id = this.wheelConfigurator.winnerAnimationId();
    if (id) {
      cancelAnimationFrame(id);
      this.wheelConfigurator.winnerAnimationId.set(undefined);
    }
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth, 800);
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight, 600);
    canvas.width = width;
    canvas.height = height;
  }

  private drawFire(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    this.fireFlickerPhase += 0.09;

    const flameBaseX = canvas.width / 2;
    const flameBaseY = canvas.height * 0.9;
    const flameWidth = Math.max(300, canvas.width * 0.3);

    const floorGlow = ctx.createRadialGradient(
      flameBaseX,
      flameBaseY + 22,
      20,
      flameBaseX,
      flameBaseY + 22,
      flameWidth * 1.35
    );
    floorGlow.addColorStop(0, 'rgba(255,190,60,0.30)');
    floorGlow.addColorStop(0.4, 'rgba(255,110,20,0.18)');
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(flameBaseX, flameBaseY + 22, flameWidth * 1.25, flameWidth * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.fireParticles.length < 300) {
      const spawnCount = 8;
      for (let i = 0; i < spawnCount; i += 1) {
        const maxLife = this.randomRange(80, 150);
        this.fireParticles.push({
          x: flameBaseX + this.randomRange(-flameWidth * 0.5, flameWidth * 0.5),
          y: flameBaseY + this.randomRange(-30, 18),
          vx: this.randomRange(-1.2, 1.2),
          vy: this.randomRange(-10.2, -5.8),
          life: maxLife,
          maxLife,
          size: this.randomRange(16, 36),
          temperature: this.randomRange(0.72, 1),
        });
      }
    }

    if (this.emberParticles.length < 80) {
      for (let i = 0; i < 2; i += 1) {
        const maxLife = this.randomRange(45, 110);
        this.emberParticles.push({
          x: flameBaseX + this.randomRange(-flameWidth * 0.42, flameWidth * 0.42),
          y: flameBaseY + this.randomRange(-20, 10),
          vx: this.randomRange(-1.8, 1.8),
          vy: this.randomRange(-6.4, -2.2),
          life: maxLife,
          maxLife,
          size: this.randomRange(1.5, 4.2),
        });
      }
    }

    if (this.smokeParticles.length < 100) {
      for (let i = 0; i < 2; i += 1) {
        const maxLife = this.randomRange(90, 170);
        this.smokeParticles.push({
          x: flameBaseX + this.randomRange(-flameWidth * 0.35, flameWidth * 0.35),
          y: flameBaseY + this.randomRange(-120, -20),
          vx: this.randomRange(-0.75, 0.75),
          vy: this.randomRange(-2.4, -0.9),
          life: maxLife,
          maxLife,
          size: this.randomRange(18, 38),
        });
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    let fireWrite = 0;
    for (let i = 0; i < this.fireParticles.length; i += 1) {
      const particle = this.fireParticles[i];
      const t = particle.life / particle.maxLife;

      particle.x += particle.vx + Math.sin(this.fireFlickerPhase + particle.y * 0.04) * 0.24;
      particle.y += particle.vy;
      particle.vy *= 0.992;
      particle.vx *= 0.99;
      particle.life -= 1;
      particle.size *= 0.995;

      if (particle.life <= 0 || particle.size <= 0.7) {
        continue;
      }

      this.fireParticles[fireWrite] = particle;
      fireWrite += 1;

      ctx.globalAlpha = Math.min(1, 0.5 + t * 0.9) * t;
      ctx.fillStyle = `rgba(255,${Math.floor(160 + 80 * particle.temperature)},${Math.floor(50 * t)},0.85)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.fireParticles.length = fireWrite;

    let emberWrite = 0;
    for (let i = 0; i < this.emberParticles.length; i += 1) {
      const ember = this.emberParticles[i];
      const t = ember.life / ember.maxLife;

      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.vy *= 0.994;
      ember.vx *= 0.996;
      ember.life -= 1;

      if (ember.life <= 0) {
        continue;
      }

      this.emberParticles[emberWrite] = ember;
      emberWrite += 1;

      ctx.globalAlpha = t;
      ctx.fillStyle = `rgba(255,${Math.floor(140 + 90 * t)},30,0.95)`;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.emberParticles.length = emberWrite;

    ctx.restore();

    let smokeWrite = 0;
    for (let i = 0; i < this.smokeParticles.length; i += 1) {
      const smoke = this.smokeParticles[i];
      const t = smoke.life / smoke.maxLife;

      smoke.x += smoke.vx + Math.sin((smoke.y + this.fireFlickerPhase * 16) * 0.03) * 0.12;
      smoke.y += smoke.vy;
      smoke.vx *= 0.997;
      smoke.vy *= 0.998;
      smoke.life -= 1;
      smoke.size *= 1.01;

      if (smoke.life <= 0 || smoke.y < -80) {
        continue;
      }

      this.smokeParticles[smokeWrite] = smoke;
      smokeWrite += 1;

      ctx.globalAlpha = 0.1 * t;
      ctx.fillStyle = `rgba(80,80,80,${0.12 * t})`;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, smoke.size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.smokeParticles.length = smokeWrite;

    const topHeat = ctx.createRadialGradient(
      flameBaseX,
      flameBaseY - 360,
      10,
      flameBaseX,
      flameBaseY - 360,
      flameWidth * 1.55
    );
    topHeat.addColorStop(0, 'rgba(255,170,80,0.16)');
    topHeat.addColorStop(0.6, 'rgba(255,90,20,0.06)');
    topHeat.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topHeat;
    ctx.beginPath();
    ctx.ellipse(flameBaseX, flameBaseY - 340, flameWidth * 1.45, flameWidth * 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCartoonFire(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    this.fireFlickerPhase += 0.055;

    const W = canvas.width;
    const H = canvas.height;
    const baseY = H;

    const tongueCount = Math.max(10, Math.floor(W / 100));
    const spacing = W / tongueCount;

    // Helper to draw one cartoon flame tongue
    const drawTongue = (
      cx: number,
      wobble: number,
      h: number,
      w: number,
      fill: string,
      strokeColor: string,
      lineWidth: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, baseY);
      ctx.bezierCurveTo(
        cx - w * 0.9, baseY - h * 0.38,
        cx - w * 0.3 + wobble * 0.3, baseY - h * 0.72,
        cx + wobble, baseY - h
      );
      ctx.bezierCurveTo(
        cx + w * 0.3 + wobble * 0.3, baseY - h * 0.72,
        cx + w * 0.9, baseY - h * 0.38,
        cx + w * 0.5, baseY
      );
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    };

    for (let i = 0; i < tongueCount; i += 1) {
      const cx = (i + 0.5) * spacing;
      const phase = this.fireFlickerPhase + i * 0.65;
      const wobble = Math.sin(phase) * 20 + Math.cos(phase * 0.55) * 10;

      // Outer — deep red
      drawTongue(
        cx, wobble,
        H * 0.58 + Math.sin(phase * 0.75) * H * 0.1,
        spacing * 0.82,
        '#c0390b', '#1a0800', 3.5
      );
      // Middle — orange
      drawTongue(
        cx, wobble * 0.85,
        H * 0.42 + Math.sin(phase * 0.9) * H * 0.08,
        spacing * 0.58,
        '#f57c00', '#7a2f00', 2.5
      );
      // Inner — yellow
      drawTongue(
        cx, wobble * 0.6,
        H * 0.26 + Math.sin(phase * 1.1) * H * 0.06,
        spacing * 0.36,
        '#ffe033', '#a06000', 2
      );
    }

    // Cartoon embers — small outlined circles floating up
    if (this.emberParticles.length < 35) {
      for (let i = 0; i < 2; i += 1) {
        const maxLife = this.randomRange(55, 115);
        this.emberParticles.push({
          x: this.randomRange(0, W),
          y: baseY - this.randomRange(10, 60),
          vx: this.randomRange(-1.4, 1.4),
          vy: this.randomRange(-3.5, -1.2),
          life: maxLife,
          maxLife,
          size: this.randomRange(4, 9),
        });
      }
    }

    let cartoonEmberWrite = 0;
    for (let i = 0; i < this.emberParticles.length; i += 1) {
      const ember = this.emberParticles[i];
      const t = ember.life / ember.maxLife;
      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.vy *= 0.98;
      ember.life -= 1;

      if (ember.life <= 0) {
        continue;
      }

      this.emberParticles[cartoonEmberWrite] = ember;
      cartoonEmberWrite += 1;

      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fillStyle = t > 0.5 ? '#ffe033' : '#f57c00';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1a0800';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.emberParticles.length = cartoonEmberWrite;
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private drawConfetti(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (this.confettiPieces.length < 240) {
      for (let i = 0; i < 8; i += 1) {
        this.confettiPieces.push({
          x: Math.random() * canvas.width,
          y: -30 - Math.random() * 180,
          vx: (Math.random() - 0.5) * 1.4,
          vy: Math.random() * 2.6 + 2.2,
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 10 + 6,
          color: this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)],
        });
      }
    }

    for (let i = this.confettiPieces.length - 1; i >= 0; i -= 1) {
      const piece = this.confettiPieces[i];
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;

      if (piece.y > canvas.height + 40) {
        piece.y = -30;
        piece.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.66);
      ctx.restore();
    }
  }

  private drawFireworks(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const now = performance.now();
    if (now - this.lastBurstAt > 520) {
      this.lastBurstAt = now;
      this.spawnFireworkBurst(canvas);
      if (Math.random() > 0.5) {
        this.spawnFireworkBurst(canvas);
      }
    }

    if (this.fireworkSparks.length > 600) {
      this.fireworkSparks.length = 600;
    }

    let writeIdx = 0;
    for (let i = 0; i < this.fireworkSparks.length; i += 1) {
      const spark = this.fireworkSparks[i];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vy += 0.02;
      spark.life -= 0.014;

      if (spark.life <= 0) {
        continue;
      }

      this.fireworkSparks[writeIdx] = spark;
      writeIdx += 1;

      ctx.globalAlpha = spark.life;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fillStyle = spark.color;
      ctx.fill();
    }
    this.fireworkSparks.length = writeIdx;
  }

  private spawnFireworkBurst(canvas: HTMLCanvasElement): void {
    const centerX = Math.random() * canvas.width;
    const centerY = Math.random() * canvas.height * 0.65 + canvas.height * 0.08;
    const sparks = 40 + Math.floor(Math.random() * 25);

    for (let i = 0; i < sparks; i += 1) {
      const angle = (Math.PI * 2 * i) / sparks;
      const speed = Math.random() * 4.4 + 1.8;
      this.fireworkSparks.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: this.fireworksColors[Math.floor(Math.random() * this.fireworksColors.length)],
        size: Math.random() * 2.4 + 1.2,
      });
    }
  }

  private drawApplause(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (this.applauseHands.length === 0) {
      this.seedHands(canvas);
    }

    for (const hand of this.applauseHands) {
      hand.phase += hand.speed;
      hand.y = hand.baseY + Math.sin(hand.phase) * 12;

      const clapScale = 1 + Math.abs(Math.sin(hand.phase * 1.9)) * 0.18;
      ctx.save();
      ctx.translate(hand.x, hand.y);
      this.drawCartoonHand(ctx, hand.scale * clapScale, hand.color);
      ctx.restore();
    }
  }

  private seedHands(canvas: HTMLCanvasElement): void {
    const handCount = 26;
    const gap = canvas.width / handCount;

    for (let i = 0; i < handCount; i += 1) {
      const x = gap * i + gap * 0.5 + (Math.random() - 0.5) * 10;
      const baseY = canvas.height - (Math.random() * 120 + 50);
      this.applauseHands.push({
        x,
        y: baseY,
        baseY,
        scale: Math.random() * 0.28 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.12 + 0.06,
        color: this.handColors[Math.floor(Math.random() * this.handColors.length)],
      });
    }
  }

  private drawCartoonHand(ctx: CanvasRenderingContext2D, scale: number, color: string): void {
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;

    // Palm
    ctx.beginPath();
    ctx.roundRect(-18, -8, 36, 34, 10);
    ctx.fill();
    ctx.stroke();

    // Fingers
    for (let finger = 0; finger < 4; finger += 1) {
      const offset = -16 + finger * 10;
      ctx.beginPath();
      ctx.roundRect(offset, -26, 8, 18, 4);
      ctx.fill();
      ctx.stroke();
    }

    // Thumb
    ctx.beginPath();
    ctx.roundRect(16, -1, 10, 16, 5);
    ctx.fill();
    ctx.stroke();
  }
}
