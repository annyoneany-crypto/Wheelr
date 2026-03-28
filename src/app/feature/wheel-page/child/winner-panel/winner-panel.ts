import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type WinnerPanelEntry = {
  id: string;
  name: string;
  wheelName: string;
  timestamp: string;
};

export type WinnerPanelPosition = 'left' | 'top' | 'right' | 'bottom';

@Component({
  selector: 'wl-winner-panel',
  templateUrl: './winner-panel.html',
  styleUrl: './winner-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnerPanel {
  entries = input.required<WinnerPanelEntry[]>();
  uiHidden = input(false);
  position = input<WinnerPanelPosition>('left');
  settingsPanelOpen = input(false);
  removeRequested = output<string>();

  entriesCount = computed(() => this.entries().length);

  requestRemove(entryId: string): void {
    this.removeRequested.emit(entryId);
  }

  isLeft(): boolean {
    return this.position() === 'left';
  }

  isRight(): boolean {
    return this.position() === 'right';
  }

  isTop(): boolean {
    return this.position() === 'top';
  }

  isBottom(): boolean {
    return this.position() === 'bottom';
  }

  isSide(): boolean {
    return this.isLeft() || this.isRight();
  }

  isHorizontal(): boolean {
    return this.isTop() || this.isBottom();
  }
}
