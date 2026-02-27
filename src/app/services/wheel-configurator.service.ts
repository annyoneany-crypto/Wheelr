import { computed, effect, ElementRef, Injectable, signal } from '@angular/core';

const STORAGE_KEYS = {
  palettes: 'giveawayWheel.palettes',
  selectedPaletteName: 'giveawayWheel.selectedPaletteName',
  names: 'giveawayWheel.names',
  bgColor: 'giveawayWheel.bgColor',
  bgImage: 'giveawayWheel.bgImage',
  centerImage: 'giveawayWheel.centerImage',
  centerLogoSize: 'giveawayWheel.centerLogoSize',
  spinDurationMs: 'giveawayWheel.spinDurationMs',
  wheelView: 'giveawayWheel.wheelView',
  soundEnabled: 'giveawayWheel.soundEnabled',
  customAudio: 'giveawayWheel.customAudio',
  winnerAudio: 'giveawayWheel.winnerAudio',
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
  } catch (e) {
    console.warn('Failed to write to localStorage', { key, value, error: e });
    // ignore (storage quota, private mode, etc.)
  }
}

// Helpers for storing images in IndexedDB instead of localStorage
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('giveawayWheel', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) {
        debugger;
        db.createObjectStore('images');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeImage(key: string, data: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const req = store.put(data, key);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  } catch {
    // ignore failures
  }
}

async function readImage(key: string): Promise<string | undefined> {
  try {
    const db = await openDb();
    return await new Promise<string | undefined>((res, rej) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.get(key);
      req.onsuccess = () => res(req.result as string | undefined);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return undefined;
  }
}

function clampDeg(deg: number): number {
  const m = deg % 360;
  return (m + 360) % 360;
}

function contrastForHex(hex: string): '#000000' | '#FFFFFF' {
  // Expect #RRGGBB
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '#FFFFFF';

  const int = Number.parseInt(m[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;

  // Perceived luminance (sRGB-ish). Threshold tuned for UI contrast.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 140 ? '#000000' : '#FFFFFF';
}

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  showModal = signal(false);

  wheelView = signal<'wheel' | 'linear'>('wheel');

  palettes = signal<ColorPalette[]>(DEFAULT_PALETTES);

  names = signal<string[]>([]);
  centerImage = signal<string>('');
  centerLogoSize = signal<'s' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'>('m');

  // use method to ensure persistence immediately
  setCenterLogoSize(size: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl') {
    this.centerLogoSize.set(size);
    writeJson(STORAGE_KEYS.centerLogoSize, size);
  }
  bgColor = signal<string>('#000'); 
  bgImage = signal<string>('');
  selectedPalette = signal<ColorPalette>(this.palettes()[0]);

  isSpinning = signal(false);
  spinDurationMs = signal(3000);
  currentRotation = signal(0);
  winner = signal<string | null>(null);

  fireAnimationId = signal<number | undefined>(undefined);

  canvasRef = signal<ElementRef<HTMLCanvasElement> | undefined>(undefined)
  ctx = signal<CanvasRenderingContext2D | undefined>(undefined)

  soundEnabled = signal<boolean>(true);
  customAudio = signal<string>('');
  winnerAudio = signal<string>('');
  private audioElement: HTMLAudioElement | undefined;
  private winnerAudioElement: HTMLAudioElement | undefined;

  setCustomAudio(audioData: string) {
    this.customAudio.set(audioData);
    writeImage(STORAGE_KEYS.customAudio, audioData).catch(() => {});
  }

  setWinnerAudio(audioData: string) {
    this.winnerAudio.set(audioData);
    writeImage(STORAGE_KEYS.winnerAudio, audioData).catch(() => {});
  }

  pointerSliceIndex = computed(() => {
    const n = this.names().length;
    if (!n) return 0;

    const rotation = this.currentRotation();
    const normalizedRotation = clampDeg(360 - clampDeg(rotation));
    const adjustedRotation = clampDeg(normalizedRotation - 90);
    return Math.floor(adjustedRotation / (360 / n));
  });

  pointerSliceColor = computed(() => {
    const n = this.names().length;
    if (!n) return '#ffffff';

    const colors = this.selectedPalette().colors;
    if (!colors.length) return '#ffffff';

    const idx = this.pointerSliceIndex();
    return colors[idx % colors.length] ?? '#ffffff';
  });

  pointerContrastColor = computed(() => {
    return contrastForHex(this.pointerSliceColor());
  });

  constructor() {
    // ensure storage hydration completes before other effects start
    this.hydrateFromStorage().then(() => {
      this.startIdleRotation();
    });

    this.setupPersistence();
  }

  private startIdleRotation(): void {
    // Slow continuous rotation when not spinning
    const degPerSecond = 6; // "piano" (~1 giro/minuto)
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (!this.isSpinning()) {
        this.currentRotation.update(r => r + degPerSecond * dt);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private async hydrateFromStorage(): Promise<void> {
    const storedPalettes = readJson<ColorPalette[]>(STORAGE_KEYS.palettes);
    const storedSelectedName = readJson<string>(STORAGE_KEYS.selectedPaletteName);
    const storedSpinDurationMs = readJson<number>(STORAGE_KEYS.spinDurationMs);
    const storedNames = readJson<string[]>(STORAGE_KEYS.names);
    const storedBgColor = readJson<string>(STORAGE_KEYS.bgColor);

    let storedBgImage = await readImage(STORAGE_KEYS.bgImage);
    let storedCenterImage = await readImage(STORAGE_KEYS.centerImage);

    const storedCenterLogoSize = readJson<string>(STORAGE_KEYS.centerLogoSize);
    const storedWheelView = readJson<string>(STORAGE_KEYS.wheelView);

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

    if (storedCenterImage) {
      this.centerImage.set(storedCenterImage);
    }

    if (
      storedCenterLogoSize === 's' ||
      storedCenterLogoSize === 'm' ||
      storedCenterLogoSize === 'l' ||
      storedCenterLogoSize === 'xl' ||
      storedCenterLogoSize === 'xxl' ||
      storedCenterLogoSize === 'xxxl'
    ) {
      console.debug('hydrated centerLogoSize', storedCenterLogoSize);
      // only override if user hasn't already changed size during hydration
      if (this.centerLogoSize() === 'm') {
        this.centerLogoSize.set(storedCenterLogoSize);
      }
    } else {
      console.debug('no valid centerLogoSize in storage, defaulting', storedCenterLogoSize);
    }

    if (storedWheelView === 'wheel' || storedWheelView === 'linear') {
      this.wheelView.set(storedWheelView);
    }

    const palettes = this.palettes();
    const selected =
      (storedSelectedName && palettes.find(p => p.name === storedSelectedName)) ||
      palettes[0];

    if (selected) {
      this.selectedPalette.set(selected);
    }

    if (typeof storedSpinDurationMs === 'number' && storedSpinDurationMs > 0) {
      this.spinDurationMs.set(storedSpinDurationMs);
    }

    // Hydrate sound settings
    const storedSoundEnabled = readJson<boolean>(STORAGE_KEYS.soundEnabled);
    if (typeof storedSoundEnabled === 'boolean') {
      this.soundEnabled.set(storedSoundEnabled);
    }

    const storedCustomAudio = await readImage(STORAGE_KEYS.customAudio);
    if (storedCustomAudio) {
      this.customAudio.set(storedCustomAudio);
    }

    const storedWinnerAudio = await readImage(STORAGE_KEYS.winnerAudio);
    if (storedWinnerAudio) {
      this.winnerAudio.set(storedWinnerAudio);
    }
  }

  private setupPersistence(): void {
    effect(() => {
      writeJson(STORAGE_KEYS.palettes, this.palettes());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.selectedPaletteName, this.selectedPalette().name);
      this.spinDurationMs();
    });

    effect(() => {
      writeJson(STORAGE_KEYS.spinDurationMs, this.spinDurationMs());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.names, this.names());
    });

    effect(() => {
      writeJson(STORAGE_KEYS.bgColor, this.bgColor());
    });

    // persist images to IndexedDB rather than localStorage
    effect(() => {
      const img = this.bgImage();
      if (img && img.length) {
        writeImage(STORAGE_KEYS.bgImage, img).catch(() => {});
      }
    });

    effect(() => {
      const img = this.centerImage();
      if (img && img.length) {
        writeImage(STORAGE_KEYS.centerImage, img).catch(() => {});
      }
    });

    effect(() => {
      writeJson(STORAGE_KEYS.wheelView, this.wheelView());
    });

    effect(() => {
      const palettes = this.palettes();
      const selectedName = this.selectedPalette().name;
      const stillExists = palettes.some(p => p.name === selectedName);
      if (!stillExists && palettes.length) {
        this.selectedPalette.set(palettes[0]);
      }
    });

    // Persist sound settings
    effect(() => {
      writeJson(STORAGE_KEYS.soundEnabled, this.soundEnabled());
    });

    effect(() => {
      const audio = this.customAudio();
      if (audio && audio.length) {
        writeImage(STORAGE_KEYS.customAudio, audio).catch(() => {});
      }
    });

    effect(() => {
      const audio = this.winnerAudio();
      if (audio && audio.length) {
        writeImage(STORAGE_KEYS.winnerAudio, audio).catch(() => {});
      }
    });
  }

  clearImagesStorage(): void {
    writeImage(STORAGE_KEYS.bgImage, '').catch(() => {});
  }

  drawWheel() {
    const canvasRef = this.canvasRef();
    const ctx = this.ctx();
    if (!canvasRef || !ctx) return;

    const canvas = canvasRef.nativeElement;
    const n = this.names().length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;
    const colors = this.selectedPalette().colors;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (n === 0) return;

    const sliceAngle = (Math.PI * 2) / n;
    this.names().forEach((name, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      // Apply contrast color based on slice background color
      const sliceColor = colors[i % colors.length];
      ctx.fillStyle = contrastForHex(sliceColor);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(name.substring(0, 15), radius - 30, 5);
      ctx.restore();
    });
  }

  spinWheel() {
    if (this.isSpinning() || this.names().length === 0) return;
    this.isSpinning.set(true);
    this.winner.set(null);
    if (this.fireAnimationId()) cancelAnimationFrame(this.fireAnimationId()!);

    // Play audio if enabled
    if (this.soundEnabled() && this.customAudio()) {
      this.playSpinAudio();
    }

    const extraDegrees = Math.floor(Math.random() * 360);
    const totalRotation = this.currentRotation() + (360 * 6) + extraDegrees;
    this.currentRotation.set(totalRotation);

    setTimeout(() => {
      this.isSpinning.set(false);
      const normalizedRotation = (360 - (totalRotation % 360)) % 360;
      let adjustedRotation = (normalizedRotation - 90 + 360) % 360;
      const winningIndex = Math.floor(adjustedRotation / (360 / this.names().length));
      this.winner.set(this.names()[winningIndex]);

      // Play winner audio if enabled
      if (this.soundEnabled() && this.winnerAudio()) {
        this.playWinnerAudio();
      }
    }, this.spinDurationMs());
  }

  private playSpinAudio(): void {
    try {
      // If audio element already exists, stop it
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }

      // Create and play new audio element
      this.audioElement = new Audio(this.customAudio());
      this.audioElement.play().catch(() => {
        // Ignore errors (e.g., autoplay policy)
      });
    } catch (e) {
      console.warn('Failed to play spin audio', e);
    }
  }

  private playWinnerAudio(): void {
    try {
      // If audio element already exists, stop it
      if (this.winnerAudioElement) {
        this.winnerAudioElement.pause();
        this.winnerAudioElement.currentTime = 0;
      }

      // Create and play new audio element
      this.winnerAudioElement = new Audio(this.winnerAudio());
      this.winnerAudioElement.play().catch(() => {
        // Ignore errors (e.g., autoplay policy)
      });
    } catch (e) {
      console.warn('Failed to play winner audio', e);
    }
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

  resetWinnerEffect(): void {
    this.winner.set(null);

    const id = this.fireAnimationId();
    if (id) {
      cancelAnimationFrame(id);
    }
    this.fireAnimationId.set(undefined);

    this.drawWheel();
  }
}
