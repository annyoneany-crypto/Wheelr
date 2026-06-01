import { Component, computed, effect, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { WheelConfigurator, WheelDisplayConfig } from '../../services/wheel-configurator.service';
import { LinearWheel } from '../../shared/extraction-effect/linear-wheel/linear-wheel';
import { Wheel } from '../../shared/extraction-effect/wheel/wheel';
import { CardsEffect } from '../../shared/extraction-effect/cards-draw/cards-draw';
import { FireEffect } from '../../shared/winner-effect/fire-effect/fire-effect';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { contrastForHex } from '../../services/global_function';
import { drawWheelCanvas } from '../../shared/extraction-effect/wheel-renderer';
import { WinnerPanel } from './child/winner-panel/winner-panel';
import type { WinnerPanelEntry } from './child/winner-panel/winner-panel';
import { WheelButton } from './child/wheel-button/wheel-button';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-wheel-page',
  imports: [LinearWheel, Wheel, CardsEffect, FireEffect, RouterModule, WinnerPanel, WheelButton],
  templateUrl: './wheel-page.html',
  styleUrl: './wheel-page.css',
  host: {
    '(window:resize)': 'calculatePreviewWheelSize()'
  }
})
export class WheelPage {
  wheelConfigurator = inject(WheelConfigurator);
  router = inject(Router);
  route = inject(ActivatedRoute);
  previewCanvasRefs = viewChildren<ElementRef<HTMLCanvasElement>>('previewWheelCanvas');

  showPanelSettings = signal<boolean>(false);
  displyPanel = signal<boolean>(true);
  uiChromeHidden = signal<boolean>(false);
  currentPanelPath = signal<string>('');
  visibleWheelConfigs = signal<WheelDisplayConfig[]>([]);
  previewWheelSize = signal(420);
  previewRotations = signal<Record<string, number>>({});
  previewSpinDurations = signal<Record<string, number>>({});
  previewSpinningWorkspaceId = signal<string | null>(null);
  previewIdleRotation = signal(0);
  wheelGridClass = computed(() => {
    const count = this.wheelConfigurator.visibleWheelCount();
    if (count <= 1) {
      return 'grid-cols-1';
    }

    return 'grid-col-1 md:grid-cols-2';
  });
  showIndependentPreview = computed(() => this.wheelConfigurator.visibleWheelCount() > 1);
  renameModalOpen = signal(false);
  renameDrafts = signal<Record<string, string>>({});
  renameDescriptionDrafts = signal<Record<string, string>>({});
  renameTargets = signal<WheelDisplayConfig[]>([]);
  qrModalOpen = signal(false);
  qrCodeDataUrl = signal('');
  qrCodeLoading = signal(false);
  qrCodeError = signal('');
  winnerHistory = signal<WinnerPanelEntry[]>([]);
  /** Per-workspace cache of loaded HTMLImageElements for preview canvas drawing. */
  previewImageCache = signal<Record<string, { wheelEl: HTMLImageElement | null; sliceEls: (HTMLImageElement | null)[] }>>({});
  /** Per-workspace winner state — independent of which workspace is currently active. */
  previewWinners = signal<Record<string, string | null>>({});
  winnerHistoryCount = computed(() => this.winnerHistory().length);
  cloudWheelId = computed(() => {
    const activeId = this.wheelConfigurator.activeWheelId();
    if (!activeId) {
      return '';
    }

    const workspaces = this.wheelConfigurator.wheelWorkspaces();
    const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId);
    const activeCloudId = activeWorkspace?.cloudConfigId?.trim() ?? '';
    if (activeCloudId) {
      return activeCloudId;
    }

    const rootId = this.wheelConfigurator.getWorkspaceRootId(activeId);
    const rootWorkspace = workspaces.find((workspace) => workspace.id === rootId);
    const rootCloudId = rootWorkspace?.cloudConfigId?.trim() ?? '';
    if (rootCloudId) {
      return rootCloudId;
    }

    const groupWorkspace = workspaces.find((workspace) =>
      (workspace.id === rootId || workspace.parentWheelId === rootId) &&
      !!workspace.cloudConfigId?.trim()
    );

    return groupWorkspace?.cloudConfigId?.trim() ?? '';
  });
  canShowQrButton = computed(() => this.cloudWheelId().length > 0);
  publicWheelPath = computed(() => {
    const wheelId = this.cloudWheelId();
    if (!wheelId) {
      return '';
    }

    return this.router.serializeUrl(this.router.createUrlTree(['/', wheelId]));
  });
  publicWheelUrl = computed(() => {
    const path = this.publicWheelPath();
    if (!path) {
      return '';
    }

    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).toString();
  });
  private handledRenameModalRequestToken = this.wheelConfigurator.renameModalRequestToken();
  private lastWinnerCaptureKey = '';
  private qrRenderRequestId = 0;
  private lastRenderedQrUrl = '';

  private refreshVisibleWheelRequestId = 0;
  isSelectingWorkspace = signal(false);
  private idleAnimationFrameId: number | null = null;
  private previewDrawAnimationFrameId: number | null = null;

  private readonly visibleConfigsEffect = effect(() => {
    if (this.isSelectingWorkspace()) {
      return;
    }

    this.wheelConfigurator.visibleWheelCount();
    this.wheelConfigurator.wheelWorkspaces();
    this.wheelConfigurator.activeWheelId();

    // Keep the active workspace preview hot while editing settings.
    this.wheelConfigurator.names();
    this.wheelConfigurator.selectedPalette();
    this.wheelConfigurator.bgColor();
    this.wheelConfigurator.bgImage();
    this.wheelConfigurator.centerImage();
    this.wheelConfigurator.centerColor();
    this.wheelConfigurator.centerText();
    this.wheelConfigurator.centerLogoSize();
    this.wheelConfigurator.fontFamily();

    void this.refreshVisibleWheelConfigs();
  });

  private readonly loadPreviewImagesEffect = effect(() => {
    const configs = this.visibleWheelConfigs();
    const next: Record<string, { wheelEl: HTMLImageElement | null; sliceEls: (HTMLImageElement | null)[] }> = {};
    for (const c of configs) {
      next[c.workspaceId] = { wheelEl: null, sliceEls: [] };
    }
    this.previewImageCache.set(next);

    for (const config of configs) {
      const id = config.workspaceId;

      if (config.wheelImage) {
        const img = new Image();
        img.onload = () => this.previewImageCache.update(p => ({ ...p, [id]: { ...p[id], wheelEl: img } }));
        img.src = config.wheelImage;
      }

      if (config.sliceImages?.length) {
        const els: (HTMLImageElement | null)[] = new Array(config.sliceImages.length).fill(null);
        let pending = config.sliceImages.length;
        const done = () => {
          if (--pending === 0) this.previewImageCache.update(p => ({ ...p, [id]: { ...p[id], sliceEls: [...els] } }));
        };
        config.sliceImages.forEach((url, i) => {
          if (!url) { done(); return; }
          const img = new Image();
          img.onload = () => { els[i] = img; done(); };
          img.onerror = () => done();
          img.src = url;
        });
      }
    }
  });

  private readonly drawPreviewEffect = effect(() => {
    const configs = this.visibleWheelConfigs();
    const canvases = this.previewCanvasRefs();
    this.previewWheelSize();
    this.wheelConfigurator.fontRenderVersion();
    this.previewImageCache(); // redraw when images finish loading

    if (this.previewDrawAnimationFrameId !== null) {
      cancelAnimationFrame(this.previewDrawAnimationFrameId);
      this.previewDrawAnimationFrameId = null;
    }

    // Draw after template updates to avoid canvas reset from width/height bindings.
    this.previewDrawAnimationFrameId = requestAnimationFrame(() => {
      canvases.forEach((canvasRef, index) => {
        const config = configs[index];
        if (!config) {
          return;
        }

        const canvas = canvasRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }

        const imgCache = this.previewImageCache()[config.workspaceId];
        this.drawPreviewWheel(canvas, ctx, config, imgCache?.wheelEl ?? null, imgCache?.sliceEls ?? []);
      });

      this.previewDrawAnimationFrameId = null;
    });
  });

  ShareOnX(): void {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out my giveaway wheel!\r\nCustomize your own and spin to win prizes! 🎉🎁 #GiveawayWheel\r\n\r\n');
    const xUrl = `https://x.com/intent/tweet?url=${url}&text=${text}`;
    window.open(xUrl, '_blank');
  }

  private readonly previewSizeEffect = effect(() => {
    this.showPanelSettings();
    this.wheelConfigurator.visibleWheelCount();
    this.calculatePreviewWheelSize();
  });

  private readonly renameModalRequestEffect = effect(() => {
    const token = this.wheelConfigurator.renameModalRequestToken();
    if (token === this.handledRenameModalRequestToken) {
      return;
    }

    this.handledRenameModalRequestToken = token;
    this.openRenameModal();
  });

  private readonly winnerHistoryEffect = effect(() => {
    // In multi-wheel preview mode the per-workspace sync effect handles history.
    if (this.showIndependentPreview()) return;

    const winner = this.wheelConfigurator.winner();
    if (!winner) {
      return;
    }

    const wheelName = this.wheelConfigurator.activeWheel()?.name ?? 'Wheel';
    const rotation = Math.floor(this.wheelConfigurator.currentRotation());
    const key = `${wheelName}|${winner}|${rotation}`;
    if (key === this.lastWinnerCaptureKey) {
      return;
    }

    this.lastWinnerCaptureKey = key;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.winnerHistory.update((current) => {
      const nextItem: WinnerPanelEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: winner,
        wheelName,
        timestamp,
      };

      return [nextItem, ...current].slice(0, 60);
    });
  });

  /**
   * Multi-wheel mode: when a spin completes for the active workspace, record the
   * winner in previewWinners (keyed by workspaceId) and add it to history.
   * This is separate from winnerHistoryEffect so each canvas has independent state.
   */
  private readonly winnerSyncEffect = effect(() => {
    if (!this.showIndependentPreview()) return;
    const winner = this.wheelConfigurator.winner();
    const isSpinning = this.wheelConfigurator.isSpinning();
    if (isSpinning || winner === null) return;

    const activeId = this.wheelConfigurator.activeWheelId();
    if (!activeId) return;

    // Only update (and add to history) when the value actually changes.
    if (this.previewWinners()[activeId] === winner) return;

    this.previewWinners.update(w => ({ ...w, [activeId]: winner }));

    const wheelName = this.wheelConfigurator.activeWheel()?.name ?? 'Wheel';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.winnerHistory.update(current => {
      const nextItem: WinnerPanelEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: winner,
        wheelName,
        timestamp,
      };
      return [nextItem, ...current].slice(0, 60);
    });
  });

  /**
   * Multi-wheel mode: when the user explicitly dismisses the winner effect
   * (via the fire-effect dismiss button), also clear that workspace's entry in
   * previewWinners so the glow disappears.
   */
  private readonly winnerDismissEffect = effect(() => {
    if (!this.showIndependentPreview()) return;
    this.wheelConfigurator.winnerDismissCount(); // subscribe to dismiss events
    const activeId = this.wheelConfigurator.activeWheelId();
    if (activeId) {
      this.previewWinners.update(w => ({ ...w, [activeId]: null }));
    }
  });

  private readonly qrModalEffect = effect(() => {
    if (!this.qrModalOpen()) {
      return;
    }

    const url = this.publicWheelUrl();
    if (!url) {
      this.qrCodeError.set('This wheel is not synced to cloud yet.');
      this.qrCodeDataUrl.set('');
      this.qrCodeLoading.set(false);
      return;
    }

    if (this.lastRenderedQrUrl === url && this.qrCodeDataUrl()) {
      return;
    }

    this.lastRenderedQrUrl = url;
    void this.generateQrCode(url);
  });

  constructor() {
    this.syncPanelStateFromRoute();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.syncPanelStateFromRoute());

    this.calculatePreviewWheelSize();
    this.startPreviewIdleRotation();
    void this.refreshVisibleWheelConfigs();
  }

  ngOnDestroy(): void {
    this.syncGlobalUiChromeClass(false);

    if (this.idleAnimationFrameId !== null) {
      cancelAnimationFrame(this.idleAnimationFrameId);
      this.idleAnimationFrameId = null;
    }

    if (this.previewDrawAnimationFrameId !== null) {
      cancelAnimationFrame(this.previewDrawAnimationFrameId);
      this.previewDrawAnimationFrameId = null;
    }
  }

  toggleUiChrome(): void {
    const nextValue = !this.uiChromeHidden();
    this.uiChromeHidden.set(nextValue);

    if (nextValue && this.showPanelSettings()) {
      this.closePanel();
    }

    this.syncGlobalUiChromeClass(nextValue);
  }

  uiChromeToggleAriaLabel(): string {
    return this.uiChromeHidden() ? 'Show header, footer and controls' : 'Hide header, footer and controls';
  }

  openQrModal(): void {
    if (!this.canShowQrButton()) {
      return;
    }

    this.qrModalOpen.set(true);
  }

  closeQrModal(): void {
    this.qrModalOpen.set(false);
  }

  private async generateQrCode(url: string): Promise<void> {
    const requestId = ++this.qrRenderRequestId;
    this.qrCodeLoading.set(true);
    this.qrCodeError.set('');

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#111111',
          light: '#FFFFFFFF',
        },
      });

      if (requestId !== this.qrRenderRequestId) {
        return;
      }

      this.qrCodeDataUrl.set(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      this.qrCodeError.set('Unable to generate QR code.');
      this.qrCodeDataUrl.set('');
    } finally {
      if (requestId === this.qrRenderRequestId) {
        this.qrCodeLoading.set(false);
      }
    }
  }

  removeWinnerHistoryEntry(entryId: string): void {
    if (!entryId) {
      return;
    }

    this.winnerHistory.update((current) => current.filter((entry) => entry.id !== entryId));
  }

  private syncGlobalUiChromeClass(isHidden: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('immersive-ui-hidden', isHidden);
  }

  previewPointerSliceColor(config: WheelDisplayConfig): string {
    return config.colors[0] ?? '#ffffff';
  }

  previewPointerContrastColor(config: WheelDisplayConfig): string {
    return contrastForHex(this.previewPointerSliceColor(config));
  }

  previewCenterContrastColor(color: string): string {
    return contrastForHex(color);
  }

  calculatePreviewWheelSize(): void {
    const visibleWheelCount = Math.max(1, this.wheelConfigurator.visibleWheelCount());
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 1024;

    // Keep a safe margin for floating controls and optional settings panel.
    const horizontalUiReserve = this.showPanelSettings()
      ? (isMobile ? 36 : 500)
      : (isMobile ? 20 : 180);
    const verticalUiReserve = visibleWheelCount > 1
      ? (isMobile ? 120 : 170)
      : (isMobile ? 130 : 140);

    const usableWidth = Math.max(220, viewportWidth - horizontalUiReserve);
    const usableHeight = Math.max(220, viewportHeight - verticalUiReserve);

    const columns = visibleWheelCount > 1 && viewportWidth >= 768 ? 2 : 1;
    const rows = Math.max(1, Math.ceil(visibleWheelCount / columns));
    const gap = 24;

    const perCellWidth = (usableWidth - gap * (columns - 1)) / columns;
    const perCellHeight = (usableHeight - gap * (rows - 1)) / rows;

    // Cap to a practical max so the pointer/text area still fits cleanly.
    const bestFitSize = Math.min(perCellWidth, perCellHeight, 760);
    const minimumSize = visibleWheelCount > 1 ? 88 : 140;
    const nextSize = Number.isFinite(bestFitSize) ? Math.floor(bestFitSize) : minimumSize;
    this.previewWheelSize.set(Math.max(minimumSize, nextSize));
  }

  private async refreshVisibleWheelConfigs(): Promise<void> {
    const requestId = ++this.refreshVisibleWheelRequestId;
    const maxVisible = this.wheelConfigurator.visibleWheelCount();
    const orderedWorkspaceIds = this.getVisibleWorkspaceIds(maxVisible);

    const loadedConfigs = await Promise.all(
      orderedWorkspaceIds.map((workspaceId) => this.wheelConfigurator.loadWheelDisplayConfig(workspaceId))
    );

    if (requestId !== this.refreshVisibleWheelRequestId) {
      return;
    }

    this.visibleWheelConfigs.set(
      loadedConfigs.filter((config): config is WheelDisplayConfig => config !== null)
    );

    // Ensure every visible wheel has a local visual rotation state.
    this.previewRotations.update((current) => {
      const next: Record<string, number> = {};
      for (const config of this.visibleWheelConfigs()) {
        next[config.workspaceId] = current[config.workspaceId] ?? 0;
      }
      return next;
    });

    this.calculatePreviewWheelSize();
  }

  private getVisibleWorkspaceIds(maxVisible: number): string[] {
    const activeId = this.wheelConfigurator.activeWheelId();

    return this.wheelConfigurator.getWorkspaceGroupIds(activeId, maxVisible);
  }

  isWorkspaceActive(workspaceId: string): boolean {
    return this.wheelConfigurator.activeWheelId() === workspaceId;
  }

  async onPreviewWheelClick(workspaceId: string): Promise<void> {
    if (!workspaceId || this.isSelectingWorkspace()) {
      return;
    }

    const visibleCount = this.wheelConfigurator.visibleWheelCount();
    let spinDuration = this.wheelConfigurator.spinDurationMs();
    const wasAlreadyActive = workspaceId === this.wheelConfigurator.activeWheelId();

    if (!wasAlreadyActive) {
      // Clicking a different wheel = workspace selection only, each wheel keeps its own winner.
      this.isSelectingWorkspace.set(true);
      try {
        await this.wheelConfigurator.loadWheelWorkspace(workspaceId);
        // Keep multi-wheel mode active while switching to the clicked wheel.
        this.wheelConfigurator.setVisibleWheelCount(visibleCount);
        spinDuration = this.wheelConfigurator.spinDurationMs();
        // Restore the winner for the newly active workspace (null if it never won).
        this.wheelConfigurator.winner.set(this.previewWinners()[workspaceId] ?? null);
      } finally {
        this.isSelectingWorkspace.set(false);
      }
      return;
    }

    // Re-clicking the already-active wheel = spin it (if not already spinning).
    if (this.wheelConfigurator.isSpinning() || this.wheelConfigurator.countdownInProgress()) {
      return;
    }

    // Clear only this workspace's previous winner before the new spin starts.
    this.previewWinners.update(w => ({ ...w, [workspaceId]: null }));

    // Keep winner math aligned with the exact visual angle of the clicked preview wheel.
    this.wheelConfigurator.currentRotation.set(this.previewCanvasRotation(workspaceId));

    const extraDegrees = this.wheelConfigurator.generateSpinExtraDegrees();
    const previewSpinDelay = this.getPreviewSpinDelayMs();
    if (previewSpinDelay > 0) {
      setTimeout(() => {
        // Keep preview spin aligned with actual spin start after countdown.
        if (this.wheelConfigurator.activeWheelId() !== workspaceId) {
          return;
        }
        this.startPreviewSpin(workspaceId, spinDuration, extraDegrees);
      }, previewSpinDelay);
    } else {
      this.startPreviewSpin(workspaceId, spinDuration, extraDegrees);
    }

    this.wheelConfigurator.spinWheel(extraDegrees);
  }

  private getPreviewSpinDelayMs(): number {
    if (!this.wheelConfigurator.countdownEnabled()) {
      return 0;
    }

    const start = Math.max(0, Math.floor(this.wheelConfigurator.countdownStart()));
    return start > 0 ? start * 1000 : 0;
  }

  previewCanvasRotation(workspaceId: string): number {
    return (this.previewRotations()[workspaceId] ?? 0) + this.previewIdleRotation();
  }

  isPreviewSpinning(workspaceId: string): boolean {
    return this.previewSpinningWorkspaceId() === workspaceId;
  }

  previewTransitionDuration(workspaceId: string): string {
    if (!this.isPreviewSpinning(workspaceId)) {
      return '0ms';
    }

    const duration = this.previewSpinDurations()[workspaceId] ?? 3000;
    return `${duration}ms`;
  }

  private startPreviewSpin(workspaceId: string, durationMs: number, extraDegrees: number): void {
    const spinDelta = 360 * 6 + extraDegrees;

    this.previewSpinDurations.update((current) => ({
      ...current,
      [workspaceId]: durationMs,
    }));

    this.previewRotations.update((current) => ({
      ...current,
      [workspaceId]: (current[workspaceId] ?? 0) + spinDelta,
    }));

    this.previewSpinningWorkspaceId.set(workspaceId);

    setTimeout(() => {
      if (this.previewSpinningWorkspaceId() === workspaceId) {
        this.previewSpinningWorkspaceId.set(null);
      }
    }, durationMs);
  }

  private startPreviewIdleRotation(): void {
    const degPerSecond = 6;
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const anyWinner = this.showIndependentPreview()
        ? Object.values(this.previewWinners()).some(w => w !== null)
        : !!this.wheelConfigurator.winner();
      if (!this.previewSpinningWorkspaceId() && !anyWinner) {
        this.previewIdleRotation.update((rotation) => rotation + degPerSecond * dt);
      }

      this.idleAnimationFrameId = requestAnimationFrame(tick);
    };

    this.idleAnimationFrameId = requestAnimationFrame(tick);
  }

  private drawPreviewWheel(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: WheelDisplayConfig,
    wheelImageEl: HTMLImageElement | null = null,
    sliceImageEls: (HTMLImageElement | null)[] = []
  ): void {
    drawWheelCanvas(canvas, ctx, {
      names: config.names,
      colors: config.colors,
      fontFamily: config.fontFamily,
      emptyFillStyle: '#5e5e5eBB',
      wheelImage: wheelImageEl,
      sliceImages: sliceImageEls,
    });
  }

  showWinnerEffectFor(workspaceId: string): boolean {
    return this.visibleWheelConfigs().find(c => c.workspaceId === workspaceId)?.showWinnerEffect ?? true;
  }

  /** SVG path for the winner-slice glow overlay on a preview wheel. */
  previewWinnerSlicePath(config: WheelDisplayConfig): string {
    const n = config.names.length;
    if (!n) return '';
    const size = this.previewWheelSize();
    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 2;
    const sliceAngle = (Math.PI * 2) / n;
    const rotation = this.previewCanvasRotation(config.workspaceId);
    const R = rotation * (Math.PI / 180);
    const clamp = (d: number) => ((d % 360) + 360) % 360;
    const k = Math.floor(clamp(clamp(360 - clamp(rotation)) - 90) / (360 / n));
    const a1 = k * sliceAngle + R;
    const a2 = a1 + sliceAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  togglePaletSettings(path: string): void {
    if (this.showPanelSettings() && this.currentPanelPath() === path) {
      this.closePanel();
      return;
    }

    this.currentPanelPath.set(path);
    this.router.navigate([{ outlets: { panel: [path] } }], { relativeTo: this.route });
    if (!this.showPanelSettings()) {
      this.showPanelSettings.set(true);
    }
  }

  closePanel(): void {
    this.showPanelSettings.set(false);
    this.currentPanelPath.set('');
    this.displyPanel.set(true);
    this.router.navigate([{ outlets: { panel: null } }], { relativeTo: this.route });
  }

  isPanelActive(path: string): boolean {
    return this.showPanelSettings() && this.currentPanelPath() === path;
  }

  panelTitle(): string {
    const path = this.currentPanelPath();
    if (path === 'users') return 'Users';
    if (path === 'color-settings') return 'Colors';
    if (path === 'effects') return 'Effects';
    if (path === 'sound') return 'Audio';
    if (path === 'wheel-manager') return 'Wheels';
    return 'Settings';
  }

  private syncPanelStateFromRoute(): void {
    const panelSnapshot = this.findOutletSnapshot(this.router.routerState.snapshot.root, 'panel');
    const panelPath = panelSnapshot?.url[0]?.path ?? '';
    const isOpen = panelPath.length > 0;

    this.currentPanelPath.set(panelPath);
    this.showPanelSettings.set(isOpen);
    this.displyPanel.set(!isOpen);
  }

  private findOutletSnapshot(snapshot: ActivatedRouteSnapshot, outletName: string): ActivatedRouteSnapshot | null {
    if (snapshot.outlet === outletName) {
      return snapshot;
    }

    for (const child of snapshot.children) {
      const match = this.findOutletSnapshot(child, outletName);
      if (match) {
        return match;
      }
    }

    return null;
  }

  closeUserPaneltransitionEnd(): void {
    if (this.showPanelSettings()) {
      this.displyPanel.set(false);
    } else {
      this.displyPanel.set(true);
    }
  }

  openRenameModal(): void {
    const targets = this.getRenameTargets();
    if (!targets.length) {
      return;
    }

    this.renameTargets.set(targets);
    const workspaces = this.wheelConfigurator.wheelWorkspaces();
    this.renameDrafts.set(Object.fromEntries(targets.map((target) => {
      const workspace = workspaces.find((item) => item.id === target.workspaceId);
      return [target.workspaceId, workspace?.name ?? target.workspaceName];
    })));
    this.renameDescriptionDrafts.set(Object.fromEntries(targets.map((target) => {
      const workspace = workspaces.find((item) => item.id === target.workspaceId);
      return [target.workspaceId, workspace?.description ?? ''];
    })));
    this.renameModalOpen.set(true);
  }

  closeRenameModal(): void {
    this.renameModalOpen.set(false);
    this.renameTargets.set([]);
    this.renameDrafts.set({});
    this.renameDescriptionDrafts.set({});
  }

  updateRenameDraft(workspaceId: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.renameDrafts.update((current) => ({
      ...current,
      [workspaceId]: target.value,
    }));
  }

  updateRenameDescriptionDraft(workspaceId: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.renameDescriptionDrafts.update((current) => ({
      ...current,
      [workspaceId]: target.value,
    }));
  }

  saveRenameModal(): void {
    const nameDrafts = this.renameDrafts();
    const descriptionDrafts = this.renameDescriptionDrafts();
    const workspaces = this.wheelConfigurator.wheelWorkspaces();
    let hasAtLeastOneRename = false;

    for (const target of this.renameTargets()) {
      const workspace = workspaces.find((item) => item.id === target.workspaceId);
      if (!workspace) {
        continue;
      }

      const nextName = (nameDrafts[target.workspaceId] ?? workspace.name).trim();
      const nextDescription = descriptionDrafts[target.workspaceId] ?? workspace.description;
      const hasChanges = nextName !== workspace.name || nextDescription !== workspace.description;
      if (!nextName || !hasChanges) {
        continue;
      }

      const renamed = this.wheelConfigurator.renameWheelWorkspace(
        target.workspaceId,
        nextName,
        nextDescription
      );

      if (renamed) {
        hasAtLeastOneRename = true;
      }
    }

    if (hasAtLeastOneRename) {
      void this.refreshVisibleWheelConfigs();
    }

    this.closeRenameModal();
  }

  renameModalTitle(): string {
    return this.showIndependentPreview() ? 'Rename visible wheels' : 'Rename selected wheel';
  }

  private getRenameTargets(): WheelDisplayConfig[] {
    if (this.showIndependentPreview()) {
      return this.visibleWheelConfigs();
    }

    const activeId = this.wheelConfigurator.activeWheelId();
    if (!activeId) {
      return [];
    }

    const activeName = this.wheelConfigurator.activeWheel()?.name ?? 'Wheel';
    return [
      {
        workspaceId: activeId,
        workspaceName: activeName,
        names: [],
        colors: [],
        bgColor: 'transparent',
        bgImage: '',
        centerImage: '',
        centerColor: '#ffffff',
        centerText: 'SPIN',
        centerLogoSize: this.wheelConfigurator.centerLogoSize(),
        fontFamily: '',
        wheelImage: '',
        sliceImages: [],
        showWinnerEffect: true,
      },
    ];
  }
}
