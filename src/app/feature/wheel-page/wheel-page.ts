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

    // if (count === 2) {
    //   return 'grid-cols-1 xl:grid-cols-2';
    // }

    // if (count === 3) {
    //   return 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3';
    // }

    return 'grid-col-1 md:grid-cols-2';
  });
  showIndependentPreview = computed(() => this.wheelConfigurator.visibleWheelCount() > 1);
  selectedWheelName = computed(() => this.wheelConfigurator.activeWheel()?.name ?? 'Wheel');

  private refreshVisibleWheelRequestId = 0;
  isSelectingWorkspace = signal(false);
  private idleAnimationFrameId: number | null = null;

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
    this.wheelConfigurator.fontFamily();

    void this.refreshVisibleWheelConfigs();
  });

  private readonly drawPreviewEffect = effect(() => {
    const configs = this.visibleWheelConfigs();
    const canvases = this.previewCanvasRefs();
    this.previewWheelSize();

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
    if (this.idleAnimationFrameId !== null) {
      cancelAnimationFrame(this.idleAnimationFrameId);
      this.idleAnimationFrameId = null;
    }
  }

  previewPointerSliceColor(config: WheelDisplayConfig): string {
    return config.colors[0] ?? '#ffffff';
  }

  previewPointerContrastColor(config: WheelDisplayConfig): string {
    return contrastForHex(this.previewPointerSliceColor(config));
  }

  calculatePreviewWheelSize(): void {
    const visibleWheelCount = this.wheelConfigurator.visibleWheelCount();
    const scaleByCount = visibleWheelCount === 1 ? 0.7 : visibleWheelCount === 2 ? 0.48 : visibleWheelCount === 3 ? 0.36 : 0.3;
    this.previewWheelSize.set(Math.min(window.innerWidth, window.innerHeight) * scaleByCount);
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

  async selectWorkspaceForEditing(workspaceId: string): Promise<void> {
    if (!workspaceId || this.isSelectingWorkspace()) {
      return;
    }

    if (workspaceId === this.wheelConfigurator.activeWheelId()) {
      return;
    }

    this.isSelectingWorkspace.set(true);
    const visibleCount = this.wheelConfigurator.visibleWheelCount();

    try {
      await this.wheelConfigurator.loadWheelWorkspace(workspaceId);
      // Keep multi-wheel mode active while switching the editable workspace.
      this.wheelConfigurator.setVisibleWheelCount(visibleCount);
    } finally {
      this.isSelectingWorkspace.set(false);
    }
  }

  async onPreviewWheelClick(workspaceId: string): Promise<void> {
    if (!workspaceId || this.isSelectingWorkspace()) {
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

    this.startPreviewSpin(workspaceId, spinDuration);
    this.wheelConfigurator.spinWheel();
  }

  previewRotation(workspaceId: string): number {
    return this.previewRotations()[workspaceId] ?? 0;
  }

  previewCanvasRotation(workspaceId: string): number {
    return this.previewRotation(workspaceId) + this.previewIdleRotation();
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

  private startPreviewSpin(workspaceId: string, durationMs: number): void {
    const extraDegrees = Math.floor(Math.random() * 360);
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

      if (!this.previewSpinningWorkspaceId()) {
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
    const fontSize = Math.max(12, Math.min(42, Math.round(radius * 0.09)));
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
      ctx.font = `bold ${fontSize}px ${config.fontFamily}`;
      ctx.fillText(name.substring(0, 15), radius - textInset, Math.round(fontSize * 0.18));
      ctx.restore();
    });
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
}
