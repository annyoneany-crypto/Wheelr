import { computed, effect, ElementRef, Injectable, signal } from '@angular/core';

const STORAGE_KEYS = {
  palettes: 'giveawayWheel.palettes',
  selectedPaletteName: 'giveawayWheel.selectedPaletteName',
  names: 'giveawayWheel.names',
  bgColor: 'giveawayWheel.bgColor',
  bgImage: 'giveawayWheel.bgImage',
  centerImage: 'giveawayWheel.centerImage',
  centerLogoSize: 'giveawayWheel.centerLogoSize',
} as const;

const DEFAULT_PALETTES: ColorPalette[] = [
  { name: 'RED', colors: ['#DC2626', '#B91C1C', '#7F1D1D', '#000000', '#FFFFFF', '#EF4444'] },
  { name: 'Vibrante', colors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
  { name: 'Neon', colors: ['#39FF14', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#4D4DFF'] },
  { name: 'Oceano', colors: ['#0891b2', '#0e7490', '#155e75', '#0369a1', '#075985', '#0c4a6e'] },
  { name: 'Tramonto', colors: ['#f43f5e', '#fb7185', '#fb923c', '#fbbf24', '#f59e0b', '#d97706'] },
];

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (storage quota, private mode, etc.)
  }
}

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  showModal = signal(false);

  palettes = signal<ColorPalette[]>(DEFAULT_PALETTES);

  names = signal<string[]>([]);
  centerImage = signal<string>('');
  centerLogoSize = signal<'s' | 'm' | 'l' | 'xl'>('m');
  bgColor = signal<string>('#000'); 
  bgImage = signal<string>('');
  selectedPalette = signal<ColorPalette>(this.palettes()[0]);

  isSpinning = signal(false);
  currentRotation = signal(0);
  winner = signal<string | null>(null);

  fireAnimationId = signal<number | undefined>(undefined);

  canvasRef = signal<ElementRef<HTMLCanvasElement> | undefined>(undefined)
  ctx = signal<CanvasRenderingContext2D | undefined>(undefined)

  constructor() {
    this.hydrateFromStorage();
    this.setupPersistence();
  }

  private hydrateFromStorage(): void {
    const storedPalettes = readJson<ColorPalette[]>(STORAGE_KEYS.palettes);
    const storedSelectedName = readJson<string>(STORAGE_KEYS.selectedPaletteName);
    const storedNames = readJson<string[]>(STORAGE_KEYS.names);
    const storedBgColor = readJson<string>(STORAGE_KEYS.bgColor);
    const storedBgImage = readJson<string>(STORAGE_KEYS.bgImage);
    const storedCenterImage = readJson<string>(STORAGE_KEYS.centerImage);
    const storedCenterLogoSize = readJson<string>(STORAGE_KEYS.centerLogoSize);

    if (Array.isArray(storedPalettes) && storedPalettes.length) {
      // Merge defaults (new app versions) with stored palettes (including custom ones)
      const byName = new Map<string, ColorPalette>();
      for (const p of storedPalettes) byName.set(p.name, p);
      for (const p of DEFAULT_PALETTES) if (!byName.has(p.name)) byName.set(p.name, p);
      this.palettes.set(Array.from(byName.values()));
    }

    if (Array.isArray(storedNames)) {
      this.names.set(storedNames);
    }

    if (typeof storedBgColor === 'string' && storedBgColor.length) {
      this.bgColor.set(storedBgColor);
    }

    if (typeof storedBgImage === 'string') {
      this.bgImage.set(storedBgImage);
    }

    if (typeof storedCenterImage === 'string') {
      this.centerImage.set(storedCenterImage);
    }

    if (
      storedCenterLogoSize === 's' ||
      storedCenterLogoSize === 'm' ||
      storedCenterLogoSize === 'l' ||
      storedCenterLogoSize === 'xl'
    ) {
      this.centerLogoSize.set(storedCenterLogoSize);
    }

    const palettes = this.palettes();
    const selected =
      (storedSelectedName && palettes.find(p => p.name === storedSelectedName)) ||
      palettes[0];

    if (selected) {
      this.selectedPalette.set(selected);
    }
  }

  private setupPersistence(): void {
    effect(() => {
      writeJson(STORAGE_KEYS.palettes, this.palettes());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.selectedPaletteName, this.selectedPalette().name);
    });

    effect(() => {
      writeJson(STORAGE_KEYS.names, this.names());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.bgColor, this.bgColor());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.bgImage, this.bgImage());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.centerImage, this.centerImage());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.centerLogoSize, this.centerLogoSize());
    });

    effect(() => {
      const palettes = this.palettes();
      const selectedName = this.selectedPalette().name;
      const stillExists = palettes.some(p => p.name === selectedName);
      if (!stillExists && palettes.length) {
        this.selectedPalette.set(palettes[0]);
      }
    });
  }

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

  setNames(aNames: string[]): void {
    this.names.set(aNames)
  }
}
