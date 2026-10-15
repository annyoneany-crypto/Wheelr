import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NativePlatformService } from '../../../../services/native-platform.service';
import { WinnerPanelEntry } from '../winner-panel/winner-panel';

export type WheelPanelPath = 'users' | 'color-settings' | 'effects' | 'sound' | 'wheel-manager';

export interface WheelPanelAction {
  path: WheelPanelPath;
  icon: string;
  ariaLabel: string;
  /** Short caption, shown under the icon in the mobile bottom bar and as the panel title. */
  caption: string;
}

/** How far (px) the sheet has to be dragged down before letting go closes it. */
const SHEET_DISMISS_DISTANCE = 90;

@Component({
  selector: 'wl-wheel-button',
  imports: [RouterModule],
  templateUrl: './wheel-button.html',
  styleUrl: './wheel-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class WheelButton {
  private readonly nativePlatform = inject(NativePlatformService);

  /**
   * Single source for both layouts: the desktop rail stacks all of these
   * vertically. On a phone the bar only has room for four tabs around the spin
   * button, so the less frequent panels (`inMoreSheet`) move to the "More" sheet.
   */
  readonly panelActions: readonly WheelPanelAction[] = [
    { path: 'users', icon: 'fa-user-plus', ariaLabel: $localize`:@@bar.panel.users.aria:Open users panel`, caption: $localize`:@@bar.panel.users.caption:Names` },
    { path: 'color-settings', icon: 'fa-swatchbook', ariaLabel: $localize`:@@bar.panel.colors.aria:Open color settings panel`, caption: $localize`:@@bar.panel.colors.caption:Colors` },
    { path: 'sound', icon: 'fa-volume-high', ariaLabel: $localize`:@@bar.panel.sound.aria:Open sound panel`, caption: $localize`:@@bar.panel.sound.caption:Sound` },
    { path: 'effects', icon: 'fa-wand-magic-sparkles', ariaLabel: $localize`:@@bar.panel.effects.aria:Open effects panel`, caption: $localize`:@@bar.panel.effects.caption:Effects` },
    { path: 'wheel-manager', icon: 'fa-layer-group', ariaLabel: $localize`:@@bar.panel.wheels.aria:Open wheel manager panel`, caption: $localize`:@@bar.panel.wheels.caption:Wheels` }
  ];

  private readonly moreSheetPaths: readonly WheelPanelPath[] = ['sound', 'wheel-manager'];

  /** Bar tabs left of the spin button. */
  readonly barActionsStart = this.panelActions.filter((a) => a.path === 'users' || a.path === 'color-settings');
  /** Bar tabs right of the spin button (the "More" tab follows them). */
  readonly barActionsEnd = this.panelActions.filter((a) => a.path === 'effects');
  readonly moreActions = this.panelActions.filter((a) => this.moreSheetPaths.includes(a.path));

  uiChromeHidden = input(false);
  showPanelSettings = input(false);
  activePanel = input('');
  displyPanel = input(true);
  panelTitle = input('Settings');
  uiChromeToggleAriaLabel = input('Hide header, footer and controls');
  canShowQrButton = input(false);
  qrModalOpen = input(false);
  /** Drives the spin button's state; the page decides what a spin means for the current view. */
  isSpinning = input(false);
  canSpin = input(true);
  /** Winners shown in the "More" sheet — the side list is desktop-only. */
  winners = input<readonly WinnerPanelEntry[]>([]);
  showWinners = input(true);

  togglePanelRequested = output<WheelPanelPath>();
  closePanelRequested = output<void>();
  usersButtonTransitionEnd = output<void>();
  uiChromeToggleRequested = output<void>();
  openQrRequested = output<void>();
  spinRequested = output<void>();

  readonly moreSheetOpen = signal(false);
  /** Live drag distance of the settings sheet, in px (0 when not dragging). */
  readonly sheetDragOffset = signal(0);
  readonly isDraggingSheet = signal(false);
  private dragStartY: number | null = null;

  readonly isMoreActive = computed(
    () =>
      this.moreSheetOpen() ||
      (this.showPanelSettings() && this.moreSheetPaths.includes(this.activePanel() as WheelPanelPath))
  );

  readonly recentWinners = computed(() => this.winners().slice(0, 8));

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => {
        if (!this.moreSheetOpen()) {
          return false;
        }
        this.moreSheetOpen.set(false);
        return true;
      })
    );

    // Hiding the chrome hides the bar the sheet belongs to.
    effect(() => {
      if (this.uiChromeHidden()) {
        this.moreSheetOpen.set(false);
      }
    });
  }

  requestTogglePanel(path: WheelPanelPath): void {
    this.moreSheetOpen.set(false);
    this.togglePanelRequested.emit(path);
  }

  requestClosePanel(): void {
    this.closePanelRequested.emit();
  }

  requestUsersButtonTransitionEnd(): void {
    this.usersButtonTransitionEnd.emit();
  }

  requestUiChromeToggle(): void {
    this.moreSheetOpen.set(false);
    this.uiChromeToggleRequested.emit();
  }

  requestOpenQr(): void {
    this.moreSheetOpen.set(false);
    this.openQrRequested.emit();
  }

  requestSpin(): void {
    this.moreSheetOpen.set(false);
    this.spinRequested.emit();
  }

  toggleMoreSheet(): void {
    const next = !this.moreSheetOpen();
    if (next && this.showPanelSettings()) {
      this.requestClosePanel();
    }
    this.moreSheetOpen.set(next);
  }

  closeMoreSheet(): void {
    this.moreSheetOpen.set(false);
  }

  onEscape(): void {
    if (this.moreSheetOpen()) {
      this.moreSheetOpen.set(false);
      return;
    }
    if (this.showPanelSettings()) {
      this.requestClosePanel();
    }
  }

  isPanelActive(path: WheelPanelPath): boolean {
    return this.showPanelSettings() && this.activePanel() === path;
  }

  // ── Swipe-down to close the settings sheet (phones only) ─────────────────
  onSheetPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.dragStartY = event.clientY;
    this.isDraggingSheet.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onSheetPointerMove(event: PointerEvent): void {
    if (this.dragStartY === null) {
      return;
    }
    this.sheetDragOffset.set(Math.max(0, event.clientY - this.dragStartY));
  }

  onSheetPointerUp(): void {
    if (this.dragStartY === null) {
      return;
    }
    const shouldClose = this.sheetDragOffset() > SHEET_DISMISS_DISTANCE;
    this.dragStartY = null;
    this.isDraggingSheet.set(false);
    this.sheetDragOffset.set(0);
    if (shouldClose) {
      this.requestClosePanel();
    }
  }

  /**
   * The drawer's show/hide is timed off the users button's own CSS transition,
   * so only that button forwards the event.
   */
  onActionTransitionEnd(action: WheelPanelAction): void {
    if (action.path !== 'users') {
      return;
    }

    this.requestUsersButtonTransitionEnd();
  }

  /**
   * Vertical position of a rail button, in rem. The rail is a 4rem grid starting
   * below the header; the UI-chrome toggle and the QR button continue the same
   * stack, hence `panelActions.length` and `+ 1` below.
   */
  desktopTopRem(index: number): number {
    return 7 + index * 4;
  }

  get uiChromeToggleTopRem(): number {
    return this.desktopTopRem(this.panelActions.length);
  }

  get qrButtonTopRem(): number {
    return this.desktopTopRem(this.panelActions.length + 1);
  }
}
