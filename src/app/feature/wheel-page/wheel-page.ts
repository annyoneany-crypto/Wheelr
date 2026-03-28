import { Component, computed, effect, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { WheelConfigurator, WheelDisplayConfig } from '../../services/wheel-configurator.service';
import { LinearWheel } from '../../shared/extraction-effect/linear-wheel/linear-wheel';
import { Wheel } from '../../shared/extraction-effect/wheel/wheel';
import { CardsEffect } from '../../shared/extraction-effect/cards-draw/cards-draw';
import { FireEffect } from '../../shared/winner-effect/fire-effect/fire-effect';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { contrastForHex } from '../../services/global_function';

@Component({
  selector: 'app-wheel-page',
  imports: [LinearWheel, Wheel, CardsEffect, FireEffect, RouterModule],
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
  private handledRenameModalRequestToken = this.wheelConfigurator.renameModalRequestToken();

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

  private readonly drawPreviewEffect = effect(() => {
    const configs = this.visibleWheelConfigs();
    const canvases = this.previewCanvasRefs();
    this.previewWheelSize();
    this.wheelConfigurator.fontRenderVersion();

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

        this.drawPreviewWheel(canvas, ctx, config);
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

    // Keep a safe margin for floating controls and optional settings panel.
    const horizontalUiReserve = this.showPanelSettings() ? 500 : 180;
    const verticalUiReserve = visibleWheelCount > 1 ? 170 : 140;

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

    if (this.wheelConfigurator.isSpinning() || this.wheelConfigurator.countdownInProgress()) {
      return;
    }

    const visibleCount = this.wheelConfigurator.visibleWheelCount();
    let spinDuration = this.wheelConfigurator.spinDurationMs();
    const wasAlreadyActive = workspaceId === this.wheelConfigurator.activeWheelId();
    if (workspaceId !== this.wheelConfigurator.activeWheelId()) {
      this.isSelectingWorkspace.set(true);
      try {
        await this.wheelConfigurator.loadWheelWorkspace(workspaceId);
        // Keep multi-wheel mode active while switching to the clicked wheel.
        this.wheelConfigurator.setVisibleWheelCount(visibleCount);
        spinDuration = this.wheelConfigurator.spinDurationMs();
      } finally {
        this.isSelectingWorkspace.set(false);
      }
    }

    // First click on a different wheel only changes selection.
    if (!wasAlreadyActive) {
      return;
    }

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

      if (!this.previewSpinningWorkspaceId() && !this.wheelConfigurator.winner()) {
        this.previewIdleRotation.update((rotation) => rotation + degPerSecond * dt);
      }

      this.idleAnimationFrameId = requestAnimationFrame(tick);
    };

    this.idleAnimationFrameId = requestAnimationFrame(tick);
  }

  private drawPreviewWheel(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: WheelDisplayConfig
  ): void {
    const n = config.names.length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;
    const textInset = Math.max(20, Math.round(radius * 0.08));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (n === 0) {
      ctx.fillStyle = '#5e5e5eBB';
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(radius, 0), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const sliceAngle = (Math.PI * 2) / n;
    config.names.forEach((name, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      const sliceColor = config.colors[i % config.colors.length] ?? '#ffffff';
      ctx.fillStyle = sliceColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = contrastForHex(sliceColor);

      const fittedText = this.fitPreviewSliceLabel(
        ctx,
        name,
        config.fontFamily,
        radius,
        textInset,
        sliceAngle,
        n
      );

      ctx.font = `bold ${fittedText.fontSize}px ${config.fontFamily}`;
      ctx.fillText(fittedText.text, radius - textInset, Math.round(fittedText.fontSize * 0.18));
      ctx.restore();
    });
  }

  private fitPreviewSliceLabel(
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
        return { text, fontSize: size };
      }
      chosenSize = size;
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
    const panelSnapshot = this.route.snapshot.children.find((child) => child.outlet === 'panel');
    const panelPath = panelSnapshot?.url[0]?.path ?? '';
    const isOpen = panelPath.length > 0;

    this.currentPanelPath.set(panelPath);
    this.showPanelSettings.set(isOpen);
    this.displyPanel.set(!isOpen);
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
      },
    ];
  }
}
