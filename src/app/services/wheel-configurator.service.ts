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
  storageKeyForWorkspace,
} from './wheel-configurator-storage';
import {
  WheelDisplayConfig,
  WheelSettingsSnapshot,
  WheelTemplateDefinition,
  WheelWorkspaceMeta,
} from './wheel-configurator.models';
import { CloudWheelSyncItem } from './wheel-cloud-repository.service';
import { drawWheelCanvas } from '../shared/extraction-effect/wheel-renderer';
import type { effectType, pointerType } from '../modules/classes/custom-type';

export type { WheelDisplayConfig, WheelWorkspaceMeta } from './wheel-configurator.models';

@Injectable({
  providedIn: 'root',
})
export class WheelConfigurator {
  private static readonly MAX_WHEELS_PER_GROUP = 4;
  private static readonly DEFAULT_FONT_LINK =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
  private static readonly DEFAULT_WHEEL_NAMES = [
    'Wheelr',
    'Spin',
    'Raffle',
    'Winner',
    'Prize',
    'Luck',
    'Fun',
    'Game',
  ];

  private readonly wheelListStorageKey = 'giveawayWheel.workspaces';
  private readonly activeWheelStorageKey = 'giveawayWheel.activeWorkspaceId';
  private readonly legacyMigrationKey = 'giveawayWheel.legacyMigratedToDefault.v1';
  private readonly wheelSettingsSnapshotKey = 'giveawayWheel.settingsSnapshot.v1';
  private readonly snapshotMigrationKey = 'giveawayWheel.snapshotMigrated.v1';
  private readonly audioManager = new WheelAudioManager();
  private readonly fontLoadTimeoutMs = 2000;
  private isHydratingWorkspace = false;

  // Returns an unbiased integer in [0, maxExclusive) using crypto when available.
  private secureRandomInt(maxExclusive: number): number {
    const max = Math.floor(maxExclusive);
    if (!Number.isFinite(max) || max <= 0) {
      return 0;
    }

    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.getRandomValues) {
      const array = new Uint32Array(1);
      const maxUint32 = 0x100000000;
      const limit = maxUint32 - (maxUint32 % max);

      let value = 0;
      do {
        cryptoApi.getRandomValues(array);
        value = array[0] ?? 0;
      } while (value >= limit);

      return value % max;
    }

    return Math.floor(Math.random() * max);
  }

  generateSpinExtraDegrees(): number {
    return this.riggedSpinExtraDegrees() ?? this.secureRandomInt(360);
  }

  /**
   * Hidden feature: ordered list of names the wheel must stop on. The first
   * spin lands on the first entry, the next spin on the second, and so on.
   * Entries are consumed as they win; entries no longer on the wheel are skipped.
   */
  presetWinners = signal<string[]>([]);

  setPresetWinners(winners: string[]): void {
    const cleaned = winners.filter((winner) => winner.trim().length > 0);
    this.presetWinners.set(cleaned);
    writeJson(this.storageKey(STORAGE_KEYS.presetWinners), cleaned);
  }

  private nextPresetWinner(): string | null {
    const names = this.names();
    for (const candidate of this.presetWinners()) {
      if (names.includes(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Extra degrees that make the spin stop on the next preset winner, or null
   * when no preset winner applies. Must be computed in the same synchronous
   * block that reads/sets currentRotation: performSpin adds the returned value
   * to the rotation captured at that moment.
   */
  private riggedSpinExtraDegrees(): number | null {
    const target = this.nextPresetWinner();
    if (!target) {
      return null;
    }

    const names = this.names();
    const matchIndices: number[] = [];
    names.forEach((name, index) => {
      if (name === target) {
        matchIndices.push(index);
      }
    });
    if (!matchIndices.length) {
      return null;
    }

    const targetIndex = matchIndices[this.secureRandomInt(matchIndices.length)] ?? matchIndices[0];
    const sliceAngle = 360 / names.length;

    // Random stop point inside the slice, kept ≥1° away from both edges so the
    // integer flooring applied to extra degrees cannot push the stop across a
    // slice boundary (flooring shifts the final angle forward by <1°).
    const jitterWindow = Math.max(0, sliceAngle - 2);
    const offsetInSlice = jitterWindow > 0 ? 0.5 + Math.random() * jitterWindow : sliceAngle / 2;
    const adjustedTarget = targetIndex * sliceAngle + offsetInSlice;

    // Invert the winner formula in performSpin:
    // adjusted = ((360 - total % 360) % 360 - 90 + 360) % 360, total = base + k*360 + extra.
    const normalized = (adjustedTarget + 90) % 360;
    const base = this.currentRotation();
    const extra = ((360 - normalized - base) % 360 + 360) % 360;
    return Math.floor(extra);
  }

  /** Remove the queue entry that just won so the next spin targets the next one. */
  private consumePresetWinner(declaredWinner: string): void {
    const queue = this.presetWinners();
    if (!queue.length) {
      return;
    }

    const names = this.names();
    const nextIndex = queue.findIndex((candidate) => names.includes(candidate));
    if (nextIndex === -1 || queue[nextIndex] !== declaredWinner) {
      return;
    }

    this.setPresetWinners(queue.filter((_, index) => index !== nextIndex));
  }

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
  renameModalRequestToken = signal(0);

  wheelView = signal<'wheel' | 'linear' | 'cards'>('wheel');
  winnerEffect = signal<effectType>('fire');
  showWinnerEffect = signal<boolean>(true);
  pointerType = signal<pointerType>('drop');

  palettes = signal<ColorPalette[]>(DEFAULT_PALETTES);

  names = signal<string[]>([]);
  // Number of entries currently on the active wheel.
  namesCount = computed(() => this.names().length);
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
  wheelImage = signal<string>('');
  sliceImages = signal<string[]>([]);
  /** Incremented each time wheel/slice image elements finish loading. Used by the wheel component to schedule a redraw at the correct renderScale. */
  imageRenderVersion = signal(0);
  private wheelImageEl = signal<HTMLImageElement | null>(null);
  private sliceImageEls = signal<(HTMLImageElement | null)[]>([]);
  selectedPalette = signal<ColorPalette>(this.palettes()[0]);

  isSpinning = signal(false);
  spinDurationMs = signal(3000);
  currentRotation = signal(0);
  winner = signal<string | null>(null);
  /** Incremented each time the winner is explicitly dismissed. Used to sync per-workspace winner state. */
  winnerDismissCount = signal(0);

  winnerAnimationId = signal<number | undefined>(undefined);

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
  showWinnersList = signal<boolean>(true);
  winnerPanelPosition = signal<'left' | 'top' | 'right' | 'bottom'>('left');
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

  requestRenameModalOpen(): void {
    this.renameModalRequestToken.update((value) => value + 1);
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

  private wheelImageStorageKey(): string {
    return `${STORAGE_KEYS.wheelImage}.${this.activeWheelId() || 'default'}`;
  }

  private sliceImagesStorageKey(): string {
    return `${STORAGE_KEYS.sliceImages}.${this.activeWheelId() || 'default'}`;
  }

  setWheelImage(dataUrl: string): void {
    this.wheelImage.set(dataUrl);
    this.loadWheelImageEl(dataUrl);
    writeImage(this.wheelImageStorageKey(), dataUrl).catch(() => {});
  }

  setSliceImages(images: string[]): void {
    const trimmed = images.slice(0, 10);
    this.sliceImages.set(trimmed);
    this.loadSliceImageEls(trimmed);
    writeImage(this.sliceImagesStorageKey(), JSON.stringify(trimmed)).catch(() => {});
  }

  private loadWheelImageEl(dataUrl: string): void {
    if (!dataUrl) {
      this.wheelImageEl.set(null);
      this.imageRenderVersion.update(v => v + 1);
      return;
    }
    const img = new Image();
    img.onload = () => { this.wheelImageEl.set(img); this.imageRenderVersion.update(v => v + 1); };
    img.onerror = () => { this.wheelImageEl.set(null); this.imageRenderVersion.update(v => v + 1); };
    img.src = dataUrl;
  }

  private loadSliceImageEls(dataUrls: string[]): void {
    if (!dataUrls.length) {
      this.sliceImageEls.set([]);
      this.imageRenderVersion.update(v => v + 1);
      return;
    }
    const els: (HTMLImageElement | null)[] = new Array(dataUrls.length).fill(null);
    let pending = dataUrls.length;
    const done = () => {
      if (--pending === 0) {
        this.sliceImageEls.set([...els]);
        this.imageRenderVersion.update(v => v + 1);
      }
    };
    dataUrls.forEach((url, i) => {
      if (!url) { done(); return; }
      const img = new Image();
      img.onload = () => { els[i] = img; done(); };
      img.onerror = () => done();
      img.src = url;
    });
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
      winnerEffect: this.winnerEffect(),
      showWinnerEffect: this.showWinnerEffect(),
      spinDurationMs: this.spinDurationMs(),
      soundEnabled: this.soundEnabled(),
      countdownEnabled: this.countdownEnabled(),
      countdownStart: this.countdownStart(),
      fontFamily: this.fontFamily(),
      fontLink: this.fontLink(),
      visibleWheelCount: this.visibleWheelCount(),
      showWinnersList: this.showWinnersList(),
      winnerPanelPosition: this.winnerPanelPosition(),
      pointerType: this.pointerType(),
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
      activeWheelImage: this.wheelImage(),
      activeSliceImages: this.sliceImages(),
      activeShowWinnerEffect: this.showWinnerEffect(),
    });
  }

  async loadWheelGroupDisplayConfigs(rootWorkspaceId: string): Promise<WheelDisplayConfig[]> {
    const rootId = this.getWorkspaceRootId(rootWorkspaceId);
    const visibleCount = this.getGroupVisibleWheelCount(rootId);
    const groupIds = this.getWorkspaceGroupIds(rootId, visibleCount);
    const resolvedConfigs = await Promise.all(groupIds.map((workspaceId) => this.loadWheelDisplayConfig(workspaceId)));
    return resolvedConfigs.filter((config): config is WheelDisplayConfig => !!config);
  }

  private getGroupVisibleWheelCount(rootWorkspaceId: string): number {
    if (!rootWorkspaceId) {
      return 1;
    }

    if (this.getWorkspaceRootId(this.activeWheelId()) === rootWorkspaceId) {
      return Math.min(4, Math.max(1, Math.floor(this.visibleWheelCount())));
    }

    const storedVisibleCount = readJson<number>(`${STORAGE_KEYS.visibleWheelCount}.${rootWorkspaceId}`);
    if (typeof storedVisibleCount === 'number' && Number.isFinite(storedVisibleCount)) {
      return Math.min(4, Math.max(1, Math.floor(storedVisibleCount)));
    }

    return 1;
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

    const activeNamesStorageKey = `${STORAGE_KEYS.names}.${activeId}`;
    const storedActiveNames = readJson<string[]>(activeNamesStorageKey);
    const hasActiveNamesConfig = Array.isArray(storedActiveNames) && storedActiveNames.length > 0;
    if (!hasActiveNamesConfig) {
      this.names.set([...WheelConfigurator.DEFAULT_WHEEL_NAMES]);
    }

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

  async createWheelWorkspaceFromTemplate(template: WheelTemplateDefinition): Promise<void> {
    const normalizedName = template.name.trim();
    if (!normalizedName || !template.names.length) {
      return;
    }

    const workspaceId = this.createWorkspaceId();

    // Seed the new workspace's scoped storage before loading it, so hydrateFromStorage
    // picks the template settings up instead of the defaults.
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.names, workspaceId), template.names);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.palettes, workspaceId), [template.palette]);
    writeJson(
      storageKeyForWorkspace(STORAGE_KEYS.selectedPaletteName, workspaceId),
      template.palette.name
    );
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.centerText, workspaceId), template.centerText);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.centerColor, workspaceId), template.centerColor);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.winnerEffect, workspaceId), template.winnerEffect);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.pointerType, workspaceId), template.pointerType);
    writeJson(
      storageKeyForWorkspace(STORAGE_KEYS.spinDurationMs, workspaceId),
      template.spinDurationMs
    );
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.wheelView, workspaceId), 'wheel');

    const now = new Date().toISOString();
    const newWorkspace: WheelWorkspaceMeta = {
      id: workspaceId,
      name: normalizedName,
      description: template.description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.wheelWorkspaces.update((workspaces) => [...workspaces, newWorkspace]);
    this.persistWorkspaceRegistry();

    await this.loadWheelWorkspace(workspaceId);
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

  setWheelCloudConfigId(workspaceId: string, cloudConfigId: string): void {
    if (!workspaceId || !cloudConfigId) {
      return;
    }

    const now = new Date().toISOString();
    let changed = false;

    this.wheelWorkspaces.update((workspaces) =>
      workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) {
          return workspace;
        }

        changed = true;
        return {
          ...workspace,
          cloudConfigId,
          cloudSyncedAt: now,
          updatedAt: now,
        };
      })
    );

    if (changed) {
      this.persistWorkspaceRegistry();
    }
  }

  setGroupCloudConfigId(rootWorkspaceId: string, cloudConfigId: string): void {
    if (!rootWorkspaceId || !cloudConfigId) {
      return;
    }

    const rootId = this.getWorkspaceRootId(rootWorkspaceId);
    const groupIds = new Set(this.getWorkspaceGroupIds(rootId, 99));
    if (!groupIds.size) {
      return;
    }

    const now = new Date().toISOString();
    let changed = false;

    this.wheelWorkspaces.update((workspaces) =>
      workspaces.map((workspace) => {
        if (!groupIds.has(workspace.id)) {
          return workspace;
        }

        changed = true;
        return {
          ...workspace,
          cloudConfigId,
          cloudSyncedAt: now,
          updatedAt: now,
        };
      })
    );

    if (changed) {
      this.persistWorkspaceRegistry();
    }
  }

  async mergeCloudWheelsToLocal(cloudWheels: CloudWheelSyncItem[]): Promise<number> {
    if (!cloudWheels.length) {
      return 0;
    }

    let workspaces = [...this.wheelWorkspaces()];
    let importedCount = 0;

    for (const cloudWheel of cloudWheels) {
      const configs = cloudWheel.displayConfigs.slice(0, WheelConfigurator.MAX_WHEELS_PER_GROUP);
      if (!configs.length) {
        continue;
      }

      const existingRoot = this.findRootWorkspaceForCloudImport(workspaces, cloudWheel);

      const rootId = existingRoot?.id ?? this.createWorkspaceId();
      const now = new Date().toISOString();

      if (existingRoot) {
        workspaces = workspaces.map((workspace) =>
          workspace.id === existingRoot.id
            ? {
                ...workspace,
                name: cloudWheel.title || workspace.name,
                description: cloudWheel.description,
                cloudConfigId: cloudWheel.cloudConfigId,
                cloudSyncedAt: now,
                updatedAt: now,
              }
            : workspace
        );
      } else {
        workspaces.push({
          id: rootId,
          name: cloudWheel.title || 'Imported wheel',
          description: cloudWheel.description,
          createdAt: now,
          updatedAt: now,
          cloudConfigId: cloudWheel.cloudConfigId,
          cloudSyncedAt: now,
        });
      }

      const groupWorkspaces = workspaces
        .filter((workspace) => workspace.id === rootId || workspace.parentWheelId === rootId)
        .sort((left, right) => {
          if (left.id === rootId) return -1;
          if (right.id === rootId) return 1;
          return left.createdAt.localeCompare(right.createdAt);
        });

      while (groupWorkspaces.length < configs.length) {
        const childId = this.createWorkspaceId();
        const childMeta: WheelWorkspaceMeta = {
          id: childId,
          name: `${cloudWheel.title || 'Imported wheel'} - ${groupWorkspaces.length + 1}`,
          description: '',
          createdAt: now,
          updatedAt: now,
          parentWheelId: rootId,
          cloudConfigId: cloudWheel.cloudConfigId,
          cloudSyncedAt: now,
        };
        groupWorkspaces.push(childMeta);
        workspaces.push(childMeta);
      }

      const targetGroup = groupWorkspaces.slice(0, configs.length);
      for (let i = 0; i < targetGroup.length; i += 1) {
        const targetWorkspace = targetGroup[i];
        const sourceConfig = configs[i];
        if (!targetWorkspace || !sourceConfig) {
          continue;
        }

        workspaces = workspaces.map((workspace) =>
          workspace.id === targetWorkspace.id
            ? {
                ...workspace,
                name: sourceConfig.workspaceName || workspace.name,
                cloudConfigId: cloudWheel.cloudConfigId,
                cloudSyncedAt: now,
                updatedAt: now,
              }
            : workspace
        );

        await this.writeDisplayConfigToWorkspaceStorage(rootId, targetWorkspace.id, sourceConfig);
      }

      writeJson(storageKeyForWorkspace(STORAGE_KEYS.visibleWheelCount, rootId), targetGroup.length);
      importedCount += 1;
    }

    this.wheelWorkspaces.set(workspaces);
    this.persistWorkspaceRegistry();
    return importedCount;
  }

  /**
   * Makes the local wheel list mirror the cloud one: cloud wheels are imported or refreshed,
   * and wheels that were previously saved to cloud but no longer exist there are dropped.
   * Wheels that were never saved to cloud have no remote counterpart to compare against,
   * so they are always kept.
   */
  async syncCloudWheelsToLocal(
    cloudWheels: CloudWheelSyncItem[]
  ): Promise<{ imported: number; removed: number }> {
    const activeIdBeforeSync = this.activeWheelId();

    const imported = await this.mergeCloudWheelsToLocal(cloudWheels);
    const removed = await this.pruneLocalWheelsMissingFromCloud(
      cloudWheels.map((cloudWheel) => cloudWheel.cloudConfigId)
    );

    // The merge rewrote workspace storage directly; re-hydrate so the wheel on screen
    // reflects what was just downloaded instead of the pre-sync signals.
    const activeStillExists = this.wheelWorkspaces().some(
      (workspace) => workspace.id === activeIdBeforeSync
    );
    if (imported && activeStillExists && !this.isSpinning() && !this.countdownInProgress()) {
      await this.loadWheelWorkspace(activeIdBeforeSync);
    }

    return { imported, removed };
  }

  private async pruneLocalWheelsMissingFromCloud(cloudConfigIds: string[]): Promise<number> {
    const remainingCloudIds = new Set(cloudConfigIds.filter((id) => !!id));

    const staleRootIds = this.wheelWorkspaces()
      .filter(
        (workspace) =>
          !workspace.parentWheelId &&
          !!workspace.cloudConfigId &&
          !remainingCloudIds.has(workspace.cloudConfigId)
      )
      .map((workspace) => workspace.id);

    let removed = 0;
    for (const rootId of staleRootIds) {
      // deleteWheelWorkspace refuses to remove the last remaining wheel, so the user
      // can never be left with an empty workspace list.
      if (await this.deleteWheelWorkspace(rootId)) {
        removed += 1;
      }
    }

    return removed;
  }

  private findRootWorkspaceForCloudImport(
    workspaces: WheelWorkspaceMeta[],
    cloudWheel: CloudWheelSyncItem
  ): WheelWorkspaceMeta | undefined {
    const byCloudConfigId = workspaces.find(
      (workspace) => !workspace.parentWheelId && workspace.cloudConfigId === cloudWheel.cloudConfigId
    );
    if (byCloudConfigId) {
      return byCloudConfigId;
    }

    // Backward compatibility: some local wheels may still miss cloudConfigId.
    return workspaces.find(
      (workspace) => !workspace.parentWheelId && workspace.id === cloudWheel.workspaceId
    );
  }

  private async writeDisplayConfigToWorkspaceStorage(
    rootWorkspaceId: string,
    workspaceId: string,
    config: WheelDisplayConfig
  ): Promise<void> {
    const paletteName = 'Cloud Import';
    const paletteColors = config.colors.length ? [...config.colors] : ['#f59e0b'];

    writeJson(storageKeyForWorkspace(STORAGE_KEYS.palettes, workspaceId), [
      { name: paletteName, colors: paletteColors },
    ]);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.selectedPaletteName, workspaceId), paletteName);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.names, workspaceId), Array.isArray(config.names) ? config.names : []);
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.centerColor, workspaceId), config.centerColor || '#ffffff');
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.centerText, workspaceId), config.centerText || 'SPIN');
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.centerLogoSize, workspaceId), config.centerLogoSize || 'm');
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.fontFamily, workspaceId), config.fontFamily || '"Inter", sans-serif');
    writeJson(storageKeyForWorkspace(STORAGE_KEYS.wheelView, workspaceId), 'wheel');

    writeJson(STORAGE_KEYS.bgColor, config.bgColor || '#262626');

    await writeImage(storageKeyForWorkspace(STORAGE_KEYS.bgImage, rootWorkspaceId), config.bgImage || '');
    await writeImage(storageKeyForWorkspace(STORAGE_KEYS.centerImage, workspaceId), config.centerImage || '');
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
    this.winnerEffect.set('fire');
    this.showWinnerEffect.set(true);
    this.pointerType.set('drop');
    this.spinDurationMs.set(3000);
    this.soundEnabled.set(true);
    this.customAudio.set('');
    this.winnerAudio.set('');
    this.countdownAudio.set('');
    this.countdownEnabled.set(false);
    this.countdownStart.set(3);
    this.presetWinners.set([]);
    // Keep the winner-panel layout (visibility, position) and multi-wheel layout
    // during hydration; resetting them to defaults causes a one-frame flash of the
    // panel appearing/disappearing when switching between wheels. Hydration sets the
    // correct stored value right after.
    this.currentCountdown.set(null);
    this.countdownToggle.set(false);
    this.countdownInProgress.set(false);
    this.fontFamily.set('"Inter", sans-serif');
    this.fontLink.set(WheelConfigurator.DEFAULT_FONT_LINK);
    this.winner.set(null);
    this.winnerAnimationId.set(undefined);
    this.isSpinning.set(false);
    this.wheelImage.set('');
    this.sliceImages.set([]);
    this.wheelImageEl.set(null);
    this.sliceImageEls.set([]);
  }

  private idleRotationId: number | null = null;

  private startIdleRotation(): void {
    if (this.idleRotationId !== null) return; // prevent duplicates

    // Slow continuous rotation when not spinning
    const degPerSecond = 6; // slow pace (~1 rotation/minute)
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      // Also freeze during the countdown: the spin's extra degrees may already
      // be computed (preset winners, preview spins), so the base rotation must
      // not drift before performSpin consumes it.
      if (!this.isSpinning() && !this.winner() && !this.countdownInProgress()) {
        this.currentRotation.update(r => r + degPerSecond * dt);
      }

      this.idleRotationId = requestAnimationFrame(tick);
    };

    this.idleRotationId = requestAnimationFrame(tick);
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
    const storedWinnerEffect = readJson<effectType>(this.storageKey(STORAGE_KEYS.winnerEffect));
    const storedFontFamily = readJson<string>(this.storageKey(STORAGE_KEYS.fontFamily));
    const storedFontLink = readJson<string>(this.storageKey(STORAGE_KEYS.fontLink));
    const storedVisibleWheelCount = readJson<number>(this.storageKey(STORAGE_KEYS.visibleWheelCount));
    const storedShowWinnersList = readJson<boolean>(this.storageKey(STORAGE_KEYS.showWinnersList));
    const storedWinnerPanelPosition =
      readJson<'left' | 'top' | 'right' | 'bottom'>(this.storageKey(STORAGE_KEYS.winnerPanelPosition));
    const storedPointerType = readJson<pointerType>(this.storageKey(STORAGE_KEYS.pointerType));

    const effectivePalettes = activeUnifiedWheel?.palettes ?? storedPalettes;
    const effectiveSelectedName = activeUnifiedWheel?.selectedPaletteName ?? storedSelectedName;
    const effectiveSpinDurationMs = activeUnifiedWheel?.spinDurationMs ?? storedSpinDurationMs;
    const snapshotNames = activeUnifiedWheel?.names;
    const effectiveNames =
      Array.isArray(snapshotNames) && snapshotNames.length > 0 ? snapshotNames : storedNames;
    const effectiveBgColor = unifiedSnapshot?.backgrondcolor ?? storedBgColor;
    const effectiveCenterLogoSize = activeUnifiedWheel?.centerLogoSize ?? storedCenterLogoSize;
    const effectiveWheelView = activeUnifiedWheel?.wheelView ?? storedWheelView;
    const effectiveWinnerEffect = activeUnifiedWheel?.winnerEffect ?? storedWinnerEffect;
    const effectiveFontFamily = activeUnifiedWheel?.fontFamily ?? storedFontFamily;
    const effectiveFontLink = activeUnifiedWheel?.fontLink ?? storedFontLink;
    const effectiveVisibleWheelCount = activeUnifiedWheel?.visibleWheelCount ?? storedVisibleWheelCount;
    const effectiveShowWinnersList = activeUnifiedWheel?.showWinnersList ?? storedShowWinnersList;
    const effectiveWinnerPanelPosition =
      activeUnifiedWheel?.winnerPanelPosition ?? storedWinnerPanelPosition;
    const effectivePointerType = activeUnifiedWheel?.pointerType ?? storedPointerType;

    if (Array.isArray(effectivePalettes) && effectivePalettes.length) {
      // Merge defaults (new app versions) with stored palettes (including custom ones)
      const byName = new Map<string, ColorPalette>();
      for (const p of effectivePalettes) byName.set(p.name, p);
      for (const p of DEFAULT_PALETTES) if (!byName.has(p.name)) byName.set(p.name, p);
      this.palettes.set(Array.from(byName.values()));
    }

    if (Array.isArray(effectiveNames) && effectiveNames.length > 0) {
      this.names.set(effectiveNames);
    } else {
      const hasStoredNames =
        Array.isArray(storedNames) && storedNames.length > 0;
      const hasSnapshotNames =
        Array.isArray(activeUnifiedWheel?.names) && activeUnifiedWheel.names.length > 0;

      if (!hasStoredNames && !hasSnapshotNames) {
        this.names.set([...WheelConfigurator.DEFAULT_WHEEL_NAMES]);
      }
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

    const storedWheelImage = await readImage(this.wheelImageStorageKey());
    if (typeof storedWheelImage === 'string' && storedWheelImage.length) {
      this.wheelImage.set(storedWheelImage);
      this.loadWheelImageEl(storedWheelImage);
    }

    const storedSliceImagesJson = await readImage(this.sliceImagesStorageKey());
    if (typeof storedSliceImagesJson === 'string' && storedSliceImagesJson.length) {
      try {
        const parsed = JSON.parse(storedSliceImagesJson) as unknown;
        if (Array.isArray(parsed)) {
          const urls = (parsed as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 10);
          this.sliceImages.set(urls);
          this.loadSliceImageEls(urls);
        }
      } catch { /* ignore malformed data */ }
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

    if (
      effectiveWinnerEffect === 'fire' ||
      effectiveWinnerEffect === 'cartoon-fire' ||
      effectiveWinnerEffect === 'confetti' ||
      effectiveWinnerEffect === 'fireworks' ||
      effectiveWinnerEffect === 'applause'
    ) {
      this.winnerEffect.set(effectiveWinnerEffect);
    }

    const storedShowWinnerEffect = readJson<boolean>(this.storageKey(STORAGE_KEYS.showWinnerEffect));
    const effectiveShowWinnerEffect = activeUnifiedWheel?.showWinnerEffect ?? storedShowWinnerEffect;
    if (typeof effectiveShowWinnerEffect === 'boolean') {
      this.showWinnerEffect.set(effectiveShowWinnerEffect);
    }

    if (
      effectivePointerType === 'drop' ||
      effectivePointerType === 'arrow' ||
      effectivePointerType === 'finger' ||
      effectivePointerType === 'star' ||
      effectivePointerType === 'diamond' ||
      effectivePointerType === 'bolt'
    ) {
      this.pointerType.set(effectivePointerType);
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

    // Hydrate the hidden preset winners queue (local only, never synced to cloud)
    const storedPresetWinners = readJson<string[]>(this.storageKey(STORAGE_KEYS.presetWinners));
    if (Array.isArray(storedPresetWinners)) {
      this.presetWinners.set(storedPresetWinners.filter((value): value is string => typeof value === 'string'));
    }

      if (typeof effectiveVisibleWheelCount === 'number') {
        this.visibleWheelCount.set(Math.min(4, Math.max(1, Math.floor(effectiveVisibleWheelCount))));
      }

      if (typeof effectiveShowWinnersList === 'boolean') {
        this.showWinnersList.set(effectiveShowWinnersList);
      }

      if (
        effectiveWinnerPanelPosition === 'left' ||
        effectiveWinnerPanelPosition === 'top' ||
        effectiveWinnerPanelPosition === 'right' ||
        effectiveWinnerPanelPosition === 'bottom'
      ) {
        this.winnerPanelPosition.set(effectiveWinnerPanelPosition);
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
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.winnerEffect), this.winnerEffect());
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.showWinnerEffect), this.showWinnerEffect());
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.pointerType), this.pointerType());
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

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.showWinnersList), this.showWinnersList());
    });

    effect(() => {
      if (!this.activeWheelId()) return;
      writeJson(this.storageKey(STORAGE_KEYS.winnerPanelPosition), this.winnerPanelPosition());
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
      this.winnerEffect();
      this.showWinnerEffect();
      this.pointerType();
      this.spinDurationMs();
      this.soundEnabled();
      this.countdownEnabled();
      this.countdownStart();
      this.showWinnersList();
      this.winnerPanelPosition();
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

  drawWheelForCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    renderScale: number = 1,
    zoomed: boolean = false,
    labelSliceIndices?: number[]
  ): void {
    if (!canvas || !ctx) {
      return;
    }

    drawWheelCanvas(canvas, ctx, {
      names: this.names(),
      colors: this.selectedPalette().colors,
      fontFamily: this.fontFamily(),
      renderScale,
      zoomed,
      wheelImage: this.wheelImageEl(),
      sliceImages: this.sliceImageEls(),
      labelSliceIndices,
    });
  }

  /**
   * Public entrypoint invoked from the template when the wheel is clicked.
   * If countdown is enabled, run it first before performing the spin.
   */
  spinWheel(extraDegrees?: number) {
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
        this.performSpin(extraDegrees);
      });
    } else {
      this.performSpin(extraDegrees);
    }
  }

  /**
   * Internal helper containing the logic that actually spins the wheel.
   */
  private performSpin(extraDegrees?: number) {
    const spinWorkspaceId = this.activeWheelId();
    this.isSpinning.set(true);
    this.winner.set(null);
    if (this.winnerAnimationId()) cancelAnimationFrame(this.winnerAnimationId()!);

    // Play audio if enabled
    if (this.soundEnabled() && this.customAudio()) {
      this.audioManager.playSpinAudio(this.customAudio());
    }

    const resolvedExtraDegrees =
      typeof extraDegrees === 'number' && Number.isFinite(extraDegrees)
        ? ((Math.floor(extraDegrees) % 360) + 360) % 360
        : this.generateSpinExtraDegrees();
    const totalRotation = this.currentRotation() + (360 * 6) + resolvedExtraDegrees;
    this.currentRotation.set(totalRotation);

    setTimeout(() => {
      this.isSpinning.set(false);
      // If the active workspace changed while the wheel was spinning,
      // don't declare a winner for the wrong workspace.
      if (this.activeWheelId() !== spinWorkspaceId) {
        return;
      }
      const normalizedRotation = (360 - (totalRotation % 360)) % 360;
      let adjustedRotation = (normalizedRotation - 90 + 360) % 360;
      const winningIndex = Math.floor(adjustedRotation / (360 / this.names().length));
      const winningName = this.names()[winningIndex];
      this.winner.set(winningName);
      if (winningName) {
        this.consumePresetWinner(winningName);
      }

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

  setShowWinnersList(visible: boolean): void {
    this.showWinnersList.set(visible);
    writeJson(this.storageKey(STORAGE_KEYS.showWinnersList), visible);
  }

  setWinnerPanelPosition(position: 'left' | 'top' | 'right' | 'bottom'): void {
    this.winnerPanelPosition.set(position);
    writeJson(this.storageKey(STORAGE_KEYS.winnerPanelPosition), position);
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

    const id = this.winnerAnimationId();
    if (id) {
      cancelAnimationFrame(id);
    }
    this.winnerAnimationId.set(undefined);
    this.winnerDismissCount.update(c => c + 1);

    // No canvas redraw needed: the wheel is rendered the same way with or
    // without a winner, so clearing it only reverses the CSS scale() zoom.
  }
}
