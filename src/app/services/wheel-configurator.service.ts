import { computed, effect, ElementRef, Injectable, signal } from '@angular/core';
import {
  STORAGE_KEYS,
  DEFAULT_PALETTES,
  readJson,
  writeJson,
  openDb,
  writeImage,
  readImage,
  clampDeg,
  contrastForHex,
  ColorPalette,
} from './global_function';

export interface WheelWorkspaceMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  private readonly wheelListStorageKey = 'giveawayWheel.workspaces';
  private readonly activeWheelStorageKey = 'giveawayWheel.activeWorkspaceId';

  wheelWorkspaces = signal<WheelWorkspaceMeta[]>([]);
  activeWheelId = signal<string>('');
  activeWheel = computed(() => {
    const id = this.activeWheelId();
    return this.wheelWorkspaces().find((workspace) => workspace.id === id) ?? null;
  });

  showModal = signal(false);

  wheelView = signal<'wheel' | 'linear'>('wheel');

  palettes = signal<ColorPalette[]>(DEFAULT_PALETTES);

  names = signal<string[]>([]);
  centerImage = signal<string>('');
  centerLogoSize = signal<'s' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'>('m');

  // use method to ensure persistence immediately
  setCenterLogoSize(size: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl') {
    this.centerLogoSize.set(size);
    writeJson(this.storageKey(STORAGE_KEYS.centerLogoSize), size);
  }

  // font configuration for wheel text
  fontFamily = signal<string>('"Inter", sans-serif');
  // store the Google Fonts link URL so that we can reload it on startup
  fontLink = signal<string>('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

  /**
   * Update the active font family and optionally install a Google Fonts link
   */
  setFontFamily(family: string, linkHref?: string): void {
    this.fontFamily.set(family);
    writeJson(this.storageKey(STORAGE_KEYS.fontFamily), family);

    if (linkHref) {
      this.fontLink.set(linkHref);
      writeJson(this.storageKey(STORAGE_KEYS.fontLink), linkHref);
      this.loadGoogleFont(linkHref);
    }
  }

  private loadGoogleFont(href: string): void {
    let linkEl = document.getElementById('google-font-link') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'google-font-link';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }
    linkEl.href = href;
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
  countdownAudio = signal<string>('');
  private audioElement: HTMLAudioElement | undefined;
  private winnerAudioElement: HTMLAudioElement | undefined;
  private countdownAudioElement: HTMLAudioElement | undefined;

  // countdown configuration
  countdownEnabled = signal<boolean>(false);
  countdownStart = signal<number>(3);
  // internal state while running a countdown
  currentCountdown = signal<number | null>(null);
  // used to restart animation on each tick
  countdownToggle = signal<boolean>(false);
  // prevent overlapping countdowns/spins
  countdownInProgress = signal<boolean>(false);


  setCustomAudio(audioData: string) {
    this.customAudio.set(audioData);
    writeImage(this.storageKey(STORAGE_KEYS.customAudio), audioData).catch(() => {});
  }

  setWinnerAudio(audioData: string) {
    this.winnerAudio.set(audioData);
    writeImage(this.storageKey(STORAGE_KEYS.winnerAudio), audioData).catch(() => {});
  }

  setCountdownAudio(audioData: string) {
    this.countdownAudio.set(audioData);
    // Pre-load is handled by effect() in setupPersistence()
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
    this.initializeWorkspaces().then(() => {
      this.startIdleRotation();
    });

    this.setupPersistence();
  }

  private storageKey(baseKey: string): string {
    const workspaceId = this.activeWheelId() || 'default';
    return `${baseKey}.${workspaceId}`;
  }

  private persistWorkspaceRegistry(): void {
    writeJson(this.wheelListStorageKey, this.wheelWorkspaces());
  }

  private createWorkspaceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `wheel-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  private async initializeWorkspaces(): Promise<void> {
    const storedWorkspaces = readJson<WheelWorkspaceMeta[]>(this.wheelListStorageKey);
    const validWorkspaces = Array.isArray(storedWorkspaces)
      ? storedWorkspaces.filter((workspace) => !!workspace.id && !!workspace.name)
      : [];

    if (validWorkspaces.length === 0) {
      const now = new Date().toISOString();
      validWorkspaces.push({
        id: 'default',
        name: 'Ruota principale',
        description: 'Ruota predefinita',
        createdAt: now,
        updatedAt: now,
      });
    }

    this.wheelWorkspaces.set(validWorkspaces);
    this.persistWorkspaceRegistry();

    const storedActiveId = readJson<string>(this.activeWheelStorageKey);
    const fallbackId = validWorkspaces[0]?.id ?? 'default';
    const activeId =
      storedActiveId && validWorkspaces.some((workspace) => workspace.id === storedActiveId)
        ? storedActiveId
        : fallbackId;

    this.activeWheelId.set(activeId);
    writeJson(this.activeWheelStorageKey, activeId);

    await this.hydrateFromStorage();
  }

  async createWheelWorkspace(name: string, description: string): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    const now = new Date().toISOString();
    const newWorkspace: WheelWorkspaceMeta = {
      id: this.createWorkspaceId(),
      name: normalizedName,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.wheelWorkspaces.update((workspaces) => [...workspaces, newWorkspace]);
    this.persistWorkspaceRegistry();

    await this.loadWheelWorkspace(newWorkspace.id);
  }

  async loadWheelWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId || !this.wheelWorkspaces().some((workspace) => workspace.id === workspaceId)) {
      return;
    }

    this.activeWheelId.set(workspaceId);
    writeJson(this.activeWheelStorageKey, workspaceId);
    await this.hydrateFromStorage();
  }

  renameWheelWorkspace(workspaceId: string, name: string, description: string): boolean {
    const normalizedName = name.trim();
    if (!workspaceId || !normalizedName) {
      return false;
    }

    let changed = false;
    const now = new Date().toISOString();
    this.wheelWorkspaces.update((workspaces) =>
      workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) {
          return workspace;
        }
        changed = true;
        return {
          ...workspace,
          name: normalizedName,
          description: description.trim(),
          updatedAt: now,
        };
      })
    );

    if (changed) {
      this.persistWorkspaceRegistry();
    }

    return changed;
  }

  async deleteWheelWorkspace(workspaceId: string): Promise<boolean> {
    const workspaces = this.wheelWorkspaces();
    if (workspaces.length <= 1 || !workspaces.some((workspace) => workspace.id === workspaceId)) {
      return false;
    }

    this.wheelWorkspaces.set(workspaces.filter((workspace) => workspace.id !== workspaceId));
    this.persistWorkspaceRegistry();

    this.clearWorkspaceStorage(workspaceId);
    await this.clearWorkspaceIndexedDb(workspaceId);

    if (this.activeWheelId() === workspaceId) {
      const nextActiveId = this.wheelWorkspaces()[0]?.id ?? 'default';
      await this.loadWheelWorkspace(nextActiveId);
      return true;
    }

    return true;
  }

  private clearWorkspaceStorage(workspaceId: string): void {
    const allKeys = Object.values(STORAGE_KEYS);
    for (const key of allKeys) {
      localStorage.removeItem(`${key}.${workspaceId}`);
    }
  }

  private async clearWorkspaceIndexedDb(workspaceId: string): Promise<void> {
    const mediaKeys = [
      STORAGE_KEYS.bgImage,
      STORAGE_KEYS.centerImage,
      STORAGE_KEYS.customAudio,
      STORAGE_KEYS.winnerAudio,
      STORAGE_KEYS.countdownAudio,
    ];

    for (const key of mediaKeys) {
      await this.deleteImage(`${key}.${workspaceId}`);
    }
  }

  private async deleteImage(key: string): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // ignore failures
    }
  }

  private touchActiveWorkspace(): void {
    const activeId = this.activeWheelId();
    if (!activeId) return;

    const now = new Date().toISOString();
    this.wheelWorkspaces.update((workspaces) =>
      workspaces.map((workspace) =>
        workspace.id === activeId
          ? {
              ...workspace,
              updatedAt: now,
            }
          : workspace
      )
    );
    this.persistWorkspaceRegistry();
  }

  private resetStateForWorkspaceLoad(): void {
    this.palettes.set(DEFAULT_PALETTES);
    this.selectedPalette.set(DEFAULT_PALETTES[0]);
    this.names.set([]);
    this.bgColor.set('#000');
    this.bgImage.set('');
    this.centerImage.set('');
    this.centerLogoSize.set('m');
    this.wheelView.set('wheel');
    this.spinDurationMs.set(3000);
    this.soundEnabled.set(true);
    this.customAudio.set('');
    this.winnerAudio.set('');
    this.countdownAudio.set('');
    this.countdownEnabled.set(false);
    this.countdownStart.set(3);
    this.currentCountdown.set(null);
    this.countdownToggle.set(false);
    this.countdownInProgress.set(false);
    this.fontFamily.set('"Inter", sans-serif');
    this.fontLink.set('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
    this.winner.set(null);
    this.isSpinning.set(false);
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
    this.resetStateForWorkspaceLoad();

    const storedPalettes = readJson<ColorPalette[]>(this.storageKey(STORAGE_KEYS.palettes));
    const storedSelectedName = readJson<string>(this.storageKey(STORAGE_KEYS.selectedPaletteName));
    const storedSpinDurationMs = readJson<number>(this.storageKey(STORAGE_KEYS.spinDurationMs));
    const storedNames = readJson<string[]>(this.storageKey(STORAGE_KEYS.names));
    const storedBgColor = readJson<string>(this.storageKey(STORAGE_KEYS.bgColor));

    const storedBgImage = await readImage(this.storageKey(STORAGE_KEYS.bgImage));
    const storedCenterImage = await readImage(this.storageKey(STORAGE_KEYS.centerImage));

    const storedCenterLogoSize = readJson<string>(this.storageKey(STORAGE_KEYS.centerLogoSize));
    const storedWheelView = readJson<string>(this.storageKey(STORAGE_KEYS.wheelView));
    const storedFontFamily = readJson<string>(this.storageKey(STORAGE_KEYS.fontFamily));
    const storedFontLink = readJson<string>(this.storageKey(STORAGE_KEYS.fontLink));

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
    const storedSoundEnabled = readJson<boolean>(this.storageKey(STORAGE_KEYS.soundEnabled));
    if (typeof storedSoundEnabled === 'boolean') {
      this.soundEnabled.set(storedSoundEnabled);
    }

    const storedCustomAudio = await readImage(this.storageKey(STORAGE_KEYS.customAudio));
    if (storedCustomAudio) {
      this.customAudio.set(storedCustomAudio);
    }

    const storedWinnerAudio = await readImage(this.storageKey(STORAGE_KEYS.winnerAudio));
    if (storedWinnerAudio) {
      this.winnerAudio.set(storedWinnerAudio);
    }
    const storedCountdownAudio = await readImage(this.storageKey(STORAGE_KEYS.countdownAudio));
    if (storedCountdownAudio) {
      this.countdownAudio.set(storedCountdownAudio);
    }

    // Hydrate font preferences
    if (typeof storedFontFamily === 'string' && storedFontFamily.length) {
      this.fontFamily.set(storedFontFamily);
    }
    if (typeof storedFontLink === 'string' && storedFontLink.length) {
      this.fontLink.set(storedFontLink);
      this.loadGoogleFont(storedFontLink);
    } else if (this.fontLink()) {
      // no stored link but we have a default; make sure it gets injected
      this.loadGoogleFont(this.fontLink());
    }

    // Hydrate countdown settings
    const storedCountdownEnabled = readJson<boolean>(this.storageKey(STORAGE_KEYS.countdownEnabled));
    if (typeof storedCountdownEnabled === 'boolean') {
      this.countdownEnabled.set(storedCountdownEnabled);
    }
    const storedCountdownStart = readJson<number>(this.storageKey(STORAGE_KEYS.countdownStart));
    if (typeof storedCountdownStart === 'number' && storedCountdownStart >= 0) {
      this.countdownStart.set(Math.floor(storedCountdownStart));
    }
  }

  private setupPersistence(): void {
    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.palettes), this.palettes());
      this.touchActiveWorkspace();
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.selectedPaletteName), this.selectedPalette().name);
      this.spinDurationMs();
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.spinDurationMs), this.spinDurationMs());
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.names), this.names());
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.bgColor), this.bgColor());
    });

    // persist images to IndexedDB rather than localStorage
    effect(() => {
      if (!this.activeWheelId()) return;
      const img = this.bgImage();
      if (img && img.length) {
        writeImage(this.storageKey(STORAGE_KEYS.bgImage), img).catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const img = this.centerImage();
      if (img && img.length) {
        writeImage(this.storageKey(STORAGE_KEYS.centerImage), img).catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.wheelView), this.wheelView());
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
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.soundEnabled), this.soundEnabled());
    });

    // Persist font settings and redraw wheel when the font changes
    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.fontFamily), this.fontFamily());
      this.drawWheel();
    });
    effect(() => {
      if (!this.activeWheelId()) return;
      const link = this.fontLink();
      if (link && link.length) {
        writeJson(this.storageKey(STORAGE_KEYS.fontLink), link);
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const audio = this.customAudio();
      if (audio && audio.length) {
        writeImage(this.storageKey(STORAGE_KEYS.customAudio), audio).catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const audio = this.winnerAudio();
      if (audio && audio.length) {
        writeImage(this.storageKey(STORAGE_KEYS.winnerAudio), audio).catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const audio = this.countdownAudio();
      if (audio && audio.length) {
        writeImage(this.storageKey(STORAGE_KEYS.countdownAudio), audio).catch(() => {});
        // Pre-load countdown audio for instant playback
        try {
          this.countdownAudioElement = new Audio(audio);
          this.countdownAudioElement.preload = 'auto';
        } catch (e) {
          console.warn('Failed to pre-load countdown audio', e);
        }
      } else {
        // clear audio element if audio is empty
        if (this.countdownAudioElement) {
          this.countdownAudioElement.pause();
          this.countdownAudioElement = undefined;
        }
      }
    });
  }

  clearImagesStorage(): void {
    writeImage(this.storageKey(STORAGE_KEYS.bgImage), '').catch(() => {});
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
      // use the current font family from configuration
      ctx.font = `bold 26px ${this.fontFamily()}`;
      ctx.fillText(name.substring(0, 15), radius - 30, 5);
      ctx.restore();
    });
  }

  /**
   * Public entrypoint invoked from the template when the wheel is clicked.
   * If countdown is enabled, run it first before performing the spin.
   */
  spinWheel() {
    if (
      this.isSpinning() ||
      this.countdownInProgress() ||
      this.names().length === 0
    ) {
      return;
    }

    // countdown audio should be optional – we only play it if configured but
    // the countdown itself is controlled by the enabled flag & start value.
    if (this.countdownEnabled() && this.countdownStart() > 0) {
      this.countdownInProgress.set(true);
      // run countdown then perform the actual spin
      this.runCountdown().then(() => {
        this.countdownInProgress.set(false);
        this.performSpin();
      });
    } else {
      this.performSpin();
    }
  }

  /**
   * Internal helper containing the logic that actually spins the wheel.
   */
  private performSpin() {
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

  /**
   * Runs a simple numeric countdown from `countdownStart` down to 0. Each
   * step waits one second and updates `currentCountdown` signal so the UI
   * can render the value. Resolves when complete.  Note that audio playback is
   * entirely optional, the countdown still runs with or without a sound value.
   */
  private runCountdown(): Promise<void> {
    return new Promise(resolve => {
      let value = this.countdownStart();
      if (value <= 0) {
        resolve();
        return;
      }

      this.currentCountdown.set(value);
      this.countdownToggle.update(v => !v);

      // play countdown start sound once (if configured)
      if (this.soundEnabled() && this.countdownAudio()) {
        this.playCountdownAudio();
      }

      const tick = () => {
        if (value <= 0) {
          this.currentCountdown.set(null);
          resolve();
          return;
        }
        setTimeout(() => {
          value = value - 1;
          this.currentCountdown.set(value > 0 ? value : null);
          this.countdownToggle.update(v => !v);
          tick();
        }, 1000);
      };
      tick();
    });
  }

  /**
   * Update countdown enabled flag and persist it.
   */
  setCountdownEnabled(enabled: boolean) {
    this.countdownEnabled.set(enabled);
    writeJson(this.storageKey(STORAGE_KEYS.countdownEnabled), enabled);
  }

  /**
   * Update the start number for countdown and persist it.
   */
  setCountdownStart(start: number) {
    const n = Math.max(0, Math.floor(start));
    this.countdownStart.set(n);
    writeJson(this.storageKey(STORAGE_KEYS.countdownStart), n);
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

  private playCountdownAudio(): void {
    try {
      if (this.countdownAudioElement) {
        // reuse pre-loaded element
        this.countdownAudioElement.currentTime = 0;
        this.countdownAudioElement.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to play countdown audio', e);
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
