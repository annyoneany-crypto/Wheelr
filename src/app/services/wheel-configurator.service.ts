import { computed, effect, ElementRef, Injectable, signal } from '@angular/core';
import {
  STORAGE_KEYS,
  DEFAULT_PALETTES,
  readJson,
  writeJson,
  writeImage,
  readImage,
  clampDeg,
  contrastForHex,
  ColorPalette,
} from './global_function';
import { WheelAudioManager } from './wheel-audio-manager';
import {
  clearWorkspaceIndexedDb,
  clearWorkspaceStorage,
  buildSnapshotEntryFromState,
  loadWorkspaceDisplayConfig,
  migrateLegacyStorageToUnifiedSnapshot,
  saveUnifiedLocalStorageSnapshot,
} from './wheel-configurator-storage';
import { WheelSettingsSnapshot, WheelWorkspaceMeta } from './wheel-configurator.models';

export type { WheelDisplayConfig, WheelWorkspaceMeta } from './wheel-configurator.models';

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  private static readonly MAX_WHEELS_PER_GROUP = 4;
  private static readonly DEFAULT_FONT_LINK =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';

  private readonly wheelListStorageKey = 'giveawayWheel.workspaces';
  private readonly activeWheelStorageKey = 'giveawayWheel.activeWorkspaceId';
  private readonly legacyMigrationKey = 'giveawayWheel.legacyMigratedToDefault.v1';
  private readonly wheelSettingsSnapshotKey = 'giveawayWheel.settingsSnapshot.v1';
  private readonly snapshotMigrationKey = 'giveawayWheel.snapshotMigrated.v1';
  private readonly audioManager = new WheelAudioManager();
  private readonly fontLoadTimeoutMs = 2000;
  private isHydratingWorkspace = false;

  wheelWorkspaces = signal<WheelWorkspaceMeta[]>([]);
  managerWheelWorkspaces = computed(() =>
    this.wheelWorkspaces().filter((workspace) => !workspace.parentWheelId)
  );
  activeWheelId = signal<string>('');
  activeWheel = computed(() => {
    const id = this.activeWheelId();
    return this.wheelWorkspaces().find((workspace) => workspace.id === id) ?? null;
  });

  showModal = signal(false);

  wheelView = signal<'wheel' | 'linear' | 'cards'>('wheel');

  palettes = signal<ColorPalette[]>(DEFAULT_PALETTES);

  names = signal<string[]>([]);
  centerImage = signal<string>('');
  centerColor = signal<string>('#ffffff');
  centerText = signal<string>('SPIN');
  centerLogoSize = signal<'s' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'>('m');

  // use method to ensure persistence immediately
  setCenterLogoSize(size: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl') {
    this.centerLogoSize.set(size);
    writeJson(this.storageKey(STORAGE_KEYS.centerLogoSize), size);
  }

  // font configuration for wheel text
  fontFamily = signal<string>('"Inter", sans-serif');
  // store the Google Fonts link URL so that we can reload it on startup
  fontLink = signal<string>(WheelConfigurator.DEFAULT_FONT_LINK);
  fontRenderVersion = signal(0);

  /**
   * Update the active font family and optionally install a Google Fonts link
   */
  setFontFamily(family: string, linkHref?: string): void {
    this.fontFamily.set(family);
    writeJson(this.storageKey(STORAGE_KEYS.fontFamily), family);

    if (linkHref) {
      this.fontLink.set(linkHref);
      writeJson(this.storageKey(STORAGE_KEYS.fontLink), linkHref);
    }

    void this.ensureFontReady(family, linkHref);
  }

  private loadGoogleFont(href: string): Promise<void> {
    const selector = `link[rel="stylesheet"][data-google-font="true"][href="${href}"]`;
    let linkEl = document.head.querySelector(selector) as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = href;
      linkEl.setAttribute('data-google-font', 'true');
      linkEl.setAttribute('data-loaded', 'false');
      document.head.appendChild(linkEl);
    }

    if (linkEl.getAttribute('data-loaded') === 'true' || !!linkEl.sheet) {
      linkEl.setAttribute('data-loaded', 'true');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const complete = () => {
        linkEl?.setAttribute('data-loaded', 'true');
        resolve();
      };

      linkEl!.onload = () => complete();
      linkEl!.onerror = () => resolve();

      // If the browser has already cached and applied the stylesheet,
      // onload may not fire reliably in all cases.
      setTimeout(() => {
        if (linkEl?.sheet) {
          complete();
        }
      }, 250);
    });
  }

  private async ensureFontReady(family: string, linkHref?: string): Promise<void> {
    if (linkHref) {
      await this.loadGoogleFont(linkHref);
    }

    const fontsApi = (document as Document & { fonts?: FontFaceSet }).fonts;
    const primaryFamily = this.primaryFontFamily(family);

    if (fontsApi && primaryFamily.length > 0) {
      const faceDescriptor = `700 16px ${primaryFamily}`;
      await Promise.race([
        fontsApi.load(faceDescriptor).then(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, this.fontLoadTimeoutMs)),
      ]);
    }

    this.fontRenderVersion.update((value) => value + 1);
    this.drawWheel();
  }

  private primaryFontFamily(fontFamily: string): string {
    const firstFamily = fontFamily.split(',')[0]?.trim() ?? '';
    if (!firstFamily) {
      return '';
    }

    if (firstFamily.startsWith('"') || firstFamily.startsWith("'")) {
      return firstFamily;
    }

    if (/\s/.test(firstFamily)) {
      return `"${firstFamily}"`;
    }

    return firstFamily;
  }

  bgColor = signal<string>('#262626'); 
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

  // countdown configuration
  countdownEnabled = signal<boolean>(false);
  countdownStart = signal<number>(3);
  visibleWheelCount = signal<number>(1);
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

  centerContrastColor = computed(() => {
    return contrastForHex(this.centerColor());
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

  private backgroundStorageKey(): string {
    const activeId = this.activeWheelId() || 'default';
    const rootId = this.getWorkspaceRootId(activeId) || 'default';
    return `${STORAGE_KEYS.bgImage}.${rootId}`;
  }

  private buildActiveSnapshotEntry() {
    const active = this.activeWheel();
    if (!active) {
      return null;
    }

    return buildSnapshotEntryFromState({
      workspace: active,
      palettes: this.palettes(),
      selectedPaletteName: this.selectedPalette().name,
      names: this.names(),
      centerLogoSize: this.centerLogoSize(),
      wheelView: this.wheelView(),
      spinDurationMs: this.spinDurationMs(),
      soundEnabled: this.soundEnabled(),
      countdownEnabled: this.countdownEnabled(),
      countdownStart: this.countdownStart(),
      fontFamily: this.fontFamily(),
      fontLink: this.fontLink(),
      visibleWheelCount: this.visibleWheelCount(),
    });
  }

  private saveUnifiedLocalStorageSnapshot(): void {
    saveUnifiedLocalStorageSnapshot({
      activeId: this.activeWheelId(),
      bgColor: this.bgColor(),
      wheelWorkspaces: this.wheelWorkspaces(),
      activeEntry: this.buildActiveSnapshotEntry(),
      wheelSettingsSnapshotKey: this.wheelSettingsSnapshotKey,
    });
  }

  private migrateLegacyStorageToUnifiedSnapshot(
    workspaces: WheelWorkspaceMeta[],
    activeWorkspaceId: string
  ): void {
    migrateLegacyStorageToUnifiedSnapshot({
      workspaces,
      activeWorkspaceId,
      snapshotMigrationKey: this.snapshotMigrationKey,
      wheelSettingsSnapshotKey: this.wheelSettingsSnapshotKey,
      fallbackBgColor: '#262626',
    });
  }

  async loadWheelDisplayConfig(workspaceId: string) {
    return loadWorkspaceDisplayConfig({
      workspaceId,
      wheelWorkspaces: this.wheelWorkspaces(),
      activeWheelId: this.activeWheelId(),
      activeNames: this.names(),
      activePalette: this.selectedPalette(),
      activeBgColor: this.bgColor(),
      activeBgImage: this.bgImage(),
      activeCenterImage: this.centerImage(),
      activeCenterColor: this.centerColor(),
      activeCenterText: this.centerText(),
      activeCenterLogoSize: this.centerLogoSize(),
      activeFontFamily: this.fontFamily(),
    });
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

  getWorkspaceRootId(workspaceId: string): string {
    const current = this.wheelWorkspaces().find((workspace) => workspace.id === workspaceId);
    if (!current) {
      return workspaceId;
    }

    return current.parentWheelId ?? current.id;
  }

  getWorkspaceGroupIds(workspaceId: string, limit: number): string[] {
    const rootId = this.getWorkspaceRootId(workspaceId);
    const group = this.wheelWorkspaces()
      .filter((workspace) => workspace.id === rootId || workspace.parentWheelId === rootId)
      .sort((left, right) => {
        if (left.id === rootId) return -1;
        if (right.id === rootId) return 1;
        return left.createdAt.localeCompare(right.createdAt);
      });

    return group.slice(0, limit).map((workspace) => workspace.id);
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
        name: 'Main wheel',
        description: 'Default wheel',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!validWorkspaces.some((workspace) => workspace.id === 'default')) {
      const now = new Date().toISOString();
      validWorkspaces.unshift({
        id: 'default',
        name: 'Main wheel',
        description: 'Default wheel',
        createdAt: now,
        updatedAt: now,
      });
    }

    this.wheelWorkspaces.set(validWorkspaces);
    this.persistWorkspaceRegistry();

    await this.migrateLegacyDataToDefaultWorkspace();

    const storedActiveId = readJson<string>(this.activeWheelStorageKey);
    const fallbackId = validWorkspaces[0]?.id ?? 'default';
    const activeId =
      storedActiveId && validWorkspaces.some((workspace) => workspace.id === storedActiveId)
        ? storedActiveId
        : fallbackId;

    // Immediately after legacy reorganization, migrate old storage shape into unified snapshot.
    this.migrateLegacyStorageToUnifiedSnapshot(validWorkspaces, activeId);

    this.activeWheelId.set(activeId);
    writeJson(this.activeWheelStorageKey, activeId);

    await this.hydrateFromStorage();
  }

  private async migrateLegacyDataToDefaultWorkspace(): Promise<void> {
    if (readJson<boolean>(this.legacyMigrationKey)) {
      return;
    }

    const defaultWorkspaceId = 'default';
    const toScopedKey = (key: string): string => `${key}.${defaultWorkspaceId}`;

    for (const key of Object.values(STORAGE_KEYS)) {
      const legacyValue = localStorage.getItem(key);
      if (legacyValue === null) {
        continue;
      }

      const scopedKey = toScopedKey(key);
      if (localStorage.getItem(scopedKey) === null) {
        localStorage.setItem(scopedKey, legacyValue);
      }
    }

    const mediaKeys = [
      STORAGE_KEYS.bgImage,
      STORAGE_KEYS.centerImage,
      STORAGE_KEYS.customAudio,
      STORAGE_KEYS.winnerAudio,
      STORAGE_KEYS.countdownAudio,
    ];

    for (const mediaKey of mediaKeys) {
      const legacyMedia = await readImage(mediaKey);
      if (!legacyMedia) {
        continue;
      }

      const scopedMediaKey = toScopedKey(mediaKey);
      const currentMedia = await readImage(scopedMediaKey);
      if (!currentMedia) {
        await writeImage(scopedMediaKey, legacyMedia);
      }
    }

    writeJson(this.legacyMigrationKey, true);
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

  async createGroupedWheelWorkspace(parentWheelId: string, name?: string): Promise<void> {
    const parent = this.wheelWorkspaces().find((workspace) => workspace.id === parentWheelId);
    if (!parent) {
      return;
    }

    const now = new Date().toISOString();
    const siblingsCount = this.wheelWorkspaces().filter(
      (workspace) => workspace.id === parentWheelId || workspace.parentWheelId === parentWheelId
    ).length;

    if (siblingsCount >= WheelConfigurator.MAX_WHEELS_PER_GROUP) {
      return;
    }

    const childWorkspace: WheelWorkspaceMeta = {
      id: this.createWorkspaceId(),
      name: name?.trim() || `${parent.name} - ${siblingsCount + 1}`,
      description: '',
      createdAt: now,
      updatedAt: now,
      parentWheelId,
    };

    this.wheelWorkspaces.update((workspaces) => [...workspaces, childWorkspace]);
    this.persistWorkspaceRegistry();

    await this.loadWheelWorkspace(childWorkspace.id);
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
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      return false;
    }

    const rootId = this.getWorkspaceRootId(workspaceId);
    const idsToDelete = workspaces
      .filter((workspace) => workspace.id === rootId || workspace.parentWheelId === rootId)
      .map((workspace) => workspace.id);

    const managerWheelsAfterDelete = workspaces.filter(
      (workspace) => !workspace.parentWheelId && !idsToDelete.includes(workspace.id)
    );

    if (managerWheelsAfterDelete.length === 0) {
      return false;
    }

    this.wheelWorkspaces.set(workspaces.filter((workspace) => !idsToDelete.includes(workspace.id)));
    this.persistWorkspaceRegistry();

    for (const id of idsToDelete) {
      clearWorkspaceStorage(id);
      await clearWorkspaceIndexedDb(id);
    }

    if (idsToDelete.includes(this.activeWheelId())) {
      const nextActiveId = managerWheelsAfterDelete[0]?.id ?? 'default';
      await this.loadWheelWorkspace(nextActiveId);
      return true;
    }

    return true;
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
    this.centerImage.set('');
    this.centerColor.set('#ffffff');
    this.centerText.set('SPIN');
    this.centerLogoSize.set('m');
    this.wheelView.set('wheel');
    this.spinDurationMs.set(3000);
    this.soundEnabled.set(true);
    this.customAudio.set('');
    this.winnerAudio.set('');
    this.countdownAudio.set('');
    this.countdownEnabled.set(false);
    this.countdownStart.set(3);
    // Keep current multi-wheel layout during hydration to avoid a one-frame fallback to single view.
    this.currentCountdown.set(null);
    this.countdownToggle.set(false);
    this.countdownInProgress.set(false);
    this.fontFamily.set('"Inter", sans-serif');
    this.fontLink.set(WheelConfigurator.DEFAULT_FONT_LINK);
    this.winner.set(null);
    this.isSpinning.set(false);
  }

  private startIdleRotation(): void {
    // Slow continuous rotation when not spinning
    const degPerSecond = 6; // slow pace (~1 rotation/minute)
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
    this.isHydratingWorkspace = true;
    try {
      this.resetStateForWorkspaceLoad();

    const unifiedSnapshot = readJson<WheelSettingsSnapshot>(this.wheelSettingsSnapshotKey);
    const activeUnifiedWheel = unifiedSnapshot?.Wheels.find(
      (wheel) => wheel.wheelID === this.activeWheelId()
    );

    const storedPalettes = readJson<ColorPalette[]>(this.storageKey(STORAGE_KEYS.palettes));
    const storedSelectedName = readJson<string>(this.storageKey(STORAGE_KEYS.selectedPaletteName));
    const storedSpinDurationMs = readJson<number>(this.storageKey(STORAGE_KEYS.spinDurationMs));
    const storedNames = readJson<string[]>(this.storageKey(STORAGE_KEYS.names));
    const sharedBgColor = readJson<string>(STORAGE_KEYS.bgColor);
    const scopedBgColor = readJson<string>(this.storageKey(STORAGE_KEYS.bgColor));
    const storedBgColor = sharedBgColor ?? scopedBgColor;

    const scopedBgImage = await readImage(this.backgroundStorageKey());
    const legacySharedBgImage = scopedBgImage ? undefined : await readImage(STORAGE_KEYS.bgImage);
    const storedBgImage = scopedBgImage ?? legacySharedBgImage;
    const storedCenterImage = await readImage(this.storageKey(STORAGE_KEYS.centerImage));
    const storedCenterColor = readJson<string>(this.storageKey(STORAGE_KEYS.centerColor));
    const storedCenterText = readJson<string>(this.storageKey(STORAGE_KEYS.centerText));

    const storedCenterLogoSize = readJson<string>(this.storageKey(STORAGE_KEYS.centerLogoSize));
    const storedWheelView = readJson<string>(this.storageKey(STORAGE_KEYS.wheelView));
    const storedFontFamily = readJson<string>(this.storageKey(STORAGE_KEYS.fontFamily));
    const storedFontLink = readJson<string>(this.storageKey(STORAGE_KEYS.fontLink));
    const storedVisibleWheelCount = readJson<number>(this.storageKey(STORAGE_KEYS.visibleWheelCount));

    const effectivePalettes = activeUnifiedWheel?.palettes ?? storedPalettes;
    const effectiveSelectedName = activeUnifiedWheel?.selectedPaletteName ?? storedSelectedName;
    const effectiveSpinDurationMs = activeUnifiedWheel?.spinDurationMs ?? storedSpinDurationMs;
    const effectiveNames = activeUnifiedWheel?.names ?? storedNames;
    const effectiveBgColor = unifiedSnapshot?.backgrondcolor ?? storedBgColor;
    const effectiveCenterLogoSize = activeUnifiedWheel?.centerLogoSize ?? storedCenterLogoSize;
    const effectiveWheelView = activeUnifiedWheel?.wheelView ?? storedWheelView;
    const effectiveFontFamily = activeUnifiedWheel?.fontFamily ?? storedFontFamily;
    const effectiveFontLink = activeUnifiedWheel?.fontLink ?? storedFontLink;
    const effectiveVisibleWheelCount = activeUnifiedWheel?.visibleWheelCount ?? storedVisibleWheelCount;

    if (Array.isArray(effectivePalettes) && effectivePalettes.length) {
      // Merge defaults (new app versions) with stored palettes (including custom ones)
      const byName = new Map<string, ColorPalette>();
      for (const p of effectivePalettes) byName.set(p.name, p);
      for (const p of DEFAULT_PALETTES) if (!byName.has(p.name)) byName.set(p.name, p);
      this.palettes.set(Array.from(byName.values()));
    }

    if (Array.isArray(effectiveNames)) {
      this.names.set(effectiveNames);
    }

    if (typeof effectiveBgColor === 'string' && effectiveBgColor.length) {
      this.bgColor.set(effectiveBgColor);
    }

    // Backward compatibility: migrate old scoped background color to shared key.
    if (!sharedBgColor && typeof scopedBgColor === 'string' && scopedBgColor.length) {
      writeJson(STORAGE_KEYS.bgColor, scopedBgColor);
    }

    if (typeof storedBgImage === 'string') {
      this.bgImage.set(storedBgImage);
    }

    // Backward compatibility: migrate legacy shared background image to active workspace key.
    if (!scopedBgImage && typeof legacySharedBgImage === 'string' && legacySharedBgImage.length) {
      writeImage(this.backgroundStorageKey(), legacySharedBgImage).catch(() => {});
    }

    if (storedCenterImage) {
      this.centerImage.set(storedCenterImage);
    }

    if (typeof storedCenterColor === 'string' && storedCenterColor.length) {
      this.centerColor.set(storedCenterColor);
    }

    if (typeof storedCenterText === 'string' && storedCenterText.trim().length) {
      this.centerText.set(storedCenterText.trim());
    }

    if (
      effectiveCenterLogoSize === 's' ||
      effectiveCenterLogoSize === 'm' ||
      effectiveCenterLogoSize === 'l' ||
      effectiveCenterLogoSize === 'xl' ||
      effectiveCenterLogoSize === 'xxl' ||
      effectiveCenterLogoSize === 'xxxl'
    ) {
      console.debug('hydrated centerLogoSize', effectiveCenterLogoSize);
      // only override if user hasn't already changed size during hydration
      if (this.centerLogoSize() === 'm') {
        this.centerLogoSize.set(effectiveCenterLogoSize);
      }
    } else {
      console.debug('no valid centerLogoSize in storage, defaulting', effectiveCenterLogoSize);
    }

    if (effectiveWheelView === 'wheel' || effectiveWheelView === 'linear' || effectiveWheelView === 'cards') {
      this.wheelView.set(effectiveWheelView);
    }

    const palettes = this.palettes();
    const selected =
      (effectiveSelectedName && palettes.find(p => p.name === effectiveSelectedName)) ||
      palettes[0];

    if (selected) {
      this.selectedPalette.set(selected);
    }

    if (typeof effectiveSpinDurationMs === 'number' && effectiveSpinDurationMs > 0) {
      this.spinDurationMs.set(effectiveSpinDurationMs);
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
    if (typeof effectiveFontFamily === 'string' && effectiveFontFamily.length) {
      this.fontFamily.set(effectiveFontFamily);
    }
    if (typeof effectiveFontLink === 'string' && effectiveFontLink.length) {
      this.fontLink.set(effectiveFontLink);
      void this.ensureFontReady(this.fontFamily(), effectiveFontLink);
    } else if (this.fontLink()) {
      // no stored link but we have a default; make sure it gets injected
      void this.ensureFontReady(this.fontFamily(), this.fontLink());
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

      if (typeof effectiveVisibleWheelCount === 'number') {
        this.visibleWheelCount.set(Math.min(4, Math.max(1, Math.floor(effectiveVisibleWheelCount))));
      }
    } finally {
      this.isHydratingWorkspace = false;
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
      writeJson(STORAGE_KEYS.bgColor, this.bgColor());
    });

    // persist images to IndexedDB rather than localStorage
    effect(() => {
      if (!this.activeWheelId()) return;
      const img = this.bgImage();
      if (img && img.length) {
        writeImage(this.backgroundStorageKey(), img).catch(() => {});
      } else {
        writeImage(this.backgroundStorageKey(), '').catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const img = this.centerImage();
      if (!this.isHydratingWorkspace) {
        writeImage(this.storageKey(STORAGE_KEYS.centerImage), img && img.length ? img : '').catch(() => {});
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const centerColor = this.centerColor();
      if (!this.isHydratingWorkspace) {
        writeJson(this.storageKey(STORAGE_KEYS.centerColor), centerColor);
      }
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const centerText = this.centerText().trim();
      if (!this.isHydratingWorkspace) {
        writeJson(this.storageKey(STORAGE_KEYS.centerText), centerText.length ? centerText : 'SPIN');
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
      const family = this.fontFamily();
      if (!this.isHydratingWorkspace) {
        writeJson(this.storageKey(STORAGE_KEYS.fontFamily), family);
      }
      this.drawWheel();
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      const link = this.fontLink();
      if (!this.isHydratingWorkspace && link && link.length) {
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
        this.audioManager.preloadCountdownAudio(audio);
      } else {
        this.audioManager.clearCountdownAudio();
      }
    });

    // Keep a single localStorage object in sync with wheel settings.
    effect(() => {
      if (!this.activeWheelId()) return;

      this.wheelWorkspaces();
      this.activeWheelId();
      this.bgColor();
      this.visibleWheelCount();

      // active wheel settings
      this.palettes();
      this.selectedPalette();
      this.names();
      this.centerLogoSize();
      this.wheelView();
      this.spinDurationMs();
      this.soundEnabled();
      this.countdownEnabled();
      this.countdownStart();
      this.fontFamily();
      this.fontLink();

      if (this.isHydratingWorkspace) return;

      this.saveUnifiedLocalStorageSnapshot();
    });
  }

  clearImagesStorage(): void {
    writeImage(this.backgroundStorageKey(), '').catch(() => {});
  }

  drawWheel() {
    const canvasRef = this.canvasRef();
    const ctx = this.ctx();
    if (!canvasRef || !ctx) return;

    this.drawWheelForCanvas(canvasRef.nativeElement, ctx);
  }

  drawWheelForCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    if (!canvas || !ctx) {
      return;
    }

    const n = this.names().length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;
    const colors = this.selectedPalette().colors;
    const textInset = Math.max(20, Math.round(radius * 0.08));

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

      const fittedText = this.fitSliceLabel(
        ctx,
        name,
        this.fontFamily(),
        radius,
        textInset,
        sliceAngle,
        n
      );

      // Use geometry-aware font sizing so labels do not overflow narrow slices.
      ctx.font = `bold ${fittedText.fontSize}px ${this.fontFamily()}`;
      ctx.fillText(fittedText.text, radius - textInset, Math.round(fittedText.fontSize * 0.18));
      ctx.restore();
    });
  }

  private fitSliceLabel(
    ctx: CanvasRenderingContext2D,
    rawText: string,
    fontFamily: string,
    radius: number,
    textInset: number,
    sliceAngle: number,
    sliceCount: number
  ): { text: string; fontSize: number } {
    const text = rawText.trim() || '---';
    const textRadius = Math.max(8, radius - textInset);
    const maxWidth = Math.max(20, radius - textInset - 6);

    const maxFontByRadius = Math.max(8, Math.round(radius * 0.1));
    const maxFontByArc = Math.max(8, Math.floor(textRadius * sliceAngle * 0.58));
    const countScale = Math.min(1, Math.sqrt(8 / Math.max(1, sliceCount)));
    const maxFontByCount = Math.max(8, Math.floor(34 * countScale));
    const preferredFontSize = Math.min(42, maxFontByRadius, maxFontByArc, maxFontByCount);
    const minFontSize = 8;

    let chosenSize = preferredFontSize;
    for (let size = preferredFontSize; size >= minFontSize; size--) {
      ctx.font = `bold ${size}px ${fontFamily}`;
      if (ctx.measureText(text).width <= maxWidth) {
        chosenSize = size;
        return { text, fontSize: chosenSize };
      }
      chosenSize = size;
    }

    ctx.font = `bold ${chosenSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return { text, fontSize: chosenSize };
    }

    let clipped = text;
    while (clipped.length > 1) {
      clipped = clipped.slice(0, -1);
      const candidate = `${clipped}...`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        return { text: candidate, fontSize: chosenSize };
      }
    }

    return { text: '...', fontSize: chosenSize };
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
      this.audioManager.playSpinAudio(this.customAudio());
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
        this.audioManager.playWinnerAudio(this.winnerAudio());
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
        this.audioManager.playCountdownAudio();
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

  setVisibleWheelCount(count: number): void {
    const nextCount = Math.min(4, Math.max(1, Math.floor(count)));
    this.visibleWheelCount.set(nextCount);
    writeJson(this.storageKey(STORAGE_KEYS.visibleWheelCount), nextCount);
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
