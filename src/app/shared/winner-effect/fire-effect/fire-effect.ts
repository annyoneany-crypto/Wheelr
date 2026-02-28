import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import type { IWinnerEffect } from '../../../modules/interface/IWinnerEffect';
import type { effectType } from '../../../modules/classes/custom-type';

@Component({
  selector: 'wl-fire-effect',
  imports: [],
  templateUrl: './fire-effect.html',
  styleUrl: './fire-effect.css',
})
export class FireEffect implements IWinnerEffect {
  wheelConfigurator = inject(WheelConfigurator);
  
  effectType: effectType = 'fire';

  fireCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('fireCanvas');
  private fireParticles: any[] = [];
  private starting = false;

  constructor() {
    effect(() => {
      const winner = this.wheelConfigurator.winner();
      const runningId = this.wheelConfigurator.fireAnimationId();

      if (winner && !runningId && !this.starting) {
        this.starting = true;
        setTimeout(() => {
          this.starting = false;
          this.initAnimation();
        }, 50);
      }

      if (!winner && runningId) {
        cancelAnimationFrame(runningId);
        this.wheelConfigurator.fireAnimationId.set(undefined);
      }
    });
  }

  ngOnDestroy(): void {
    const id = this.wheelConfigurator.fireAnimationId();
    if (id) {
      cancelAnimationFrame(id);
      this.wheelConfigurator.fireAnimationId.set(undefined);
    }
  }

  // Fire Animation (Particle System)
  initAnimation(): void {
    if (!this.fireCanvasRef()) return;
    const canvas = this.fireCanvasRef()!.nativeElement;
    const fctx = canvas.getContext('2d')!;
    
    // Set canvas dimensions to match parent container
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = rect?.width ?? 800;
    canvas.height = rect?.height ?? 800;
    
    this.fireParticles = [];

    const animateFire = () => {
      fctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create new particles
      if (this.fireParticles.length < 150) {
        for(let i=0; i<5; i++) {
          this.fireParticles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 120,
            y: canvas.height / 2 + 50,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 4 - 2,
            life: 1,
            color: Math.random() > 0.5 ? '#f97316' : '#facc15',
            size: Math.random() * 15 + 5
          });
        }
      }

      // Update and draw
      for (let i = this.fireParticles.length - 1; i >= 0; i--) {
        const p = this.fireParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.96;

        if (p.life <= 0) {
          this.fireParticles.splice(i, 1);
          continue;
        }

        fctx.globalAlpha = p.life;
        fctx.beginPath();
        fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        fctx.fillStyle = p.color;
        fctx.fill();
        
        // Glow effect
        fctx.shadowBlur = 15;
        fctx.shadowColor = p.color;
      }
      
      fctx.globalAlpha = 1;
      this.wheelConfigurator.fireAnimationId.set(requestAnimationFrame(animateFire));
    };

    animateFire();
  }

  resetWinner(): void {
    this.wheelConfigurator.resetWinnerEffect();
  }
}
