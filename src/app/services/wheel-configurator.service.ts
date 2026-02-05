import { computed, ElementRef, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  showModal = signal(false);

  palettes = signal<ColorPalette[]>([
    { name: 'Vibrante', colors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
    { name: 'Neon', colors: ['#39FF14', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#4D4DFF'] },
    { name: 'Oceano', colors: ['#0891b2', '#0e7490', '#155e75', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Tramonto', colors: ['#f43f5e', '#fb7185', '#fb923c', '#fbbf24', '#f59e0b', '#d97706'] }
  ]);

  names = signal<string[]>(['Marta', 'Marco', 'Sofia', 'Davide', 'Elena', 'Giulio']);
  centerImage = signal<string>('');
  bgColor = signal<string>('oklch(20.5% 0 0)'); 
  bgImage = signal<string>('');
  selectedPalette = signal<ColorPalette>(this.palettes()[0]);

  isSpinning = signal(false);
  currentRotation = signal(0);
  winner = signal<string | null>(null);

  fireAnimationId = signal<number | undefined>(undefined);

  canvasRef = signal<ElementRef<HTMLCanvasElement> | undefined>(undefined)
  ctx = signal<CanvasRenderingContext2D | undefined>(undefined)

  drawWheel() {
    const canvas = this.canvasRef()!.nativeElement;
    const n = this.names().length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;
    const colors = this.selectedPalette().colors;

    this.ctx()!.clearRect(0, 0, canvas.width, canvas.height);
    if (n === 0) return;

    const sliceAngle = (Math.PI * 2) / n;
    this.names().forEach((name, i) => {
      const angle = i * sliceAngle;
      this.ctx()!.beginPath();
      this.ctx()!.moveTo(centerX, centerY);
      this.ctx()!.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      this.ctx()!.fillStyle = colors[i % colors.length];
      this.ctx()!.fill();
      this.ctx()!.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx()!.stroke();

      this.ctx()!.save();
      this.ctx()!.translate(centerX, centerY);
      this.ctx()!.rotate(angle + sliceAngle / 2);
      this.ctx()!.textAlign = 'right';
      this.ctx()!.fillStyle = 'white';
      this.ctx()!.font = 'bold 16px sans-serif';
      this.ctx()!.fillText(name.substring(0, 15), radius - 30, 5);
      this.ctx()!.restore();
    });
  }

  spinWheel() {
    if (this.isSpinning() || this.names().length === 0) return;
    this.isSpinning.set(true);
    this.winner.set(null);
    if (this.fireAnimationId()) cancelAnimationFrame(this.fireAnimationId()!);

    const extraDegrees = Math.floor(Math.random() * 360);
    const totalRotation = this.currentRotation() + (360 * 6) + extraDegrees;
    this.currentRotation.set(totalRotation);

    setTimeout(() => {
      this.isSpinning.set(false);
      const normalizedRotation = (360 - (totalRotation % 360)) % 360;
      let adjustedRotation = (normalizedRotation - 90 + 360) % 360;
      const winningIndex = Math.floor(adjustedRotation / (360 / this.names().length));
      this.winner.set(this.names()[winningIndex]);
    }, 4000);
  }

  shuffleNames(): void {
    const shuffled = [...this.names()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.names.set(shuffled);
  };
}
