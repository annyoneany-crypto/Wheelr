import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type WinnerPanelEntry = {
  id: string;
  name: string;
  wheelName: string;
  timestamp: string;
};

@Component({
  selector: 'wl-winner-panel',
  templateUrl: './winner-panel.html',
  styleUrl: './winner-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnerPanel {
  entries = input.required<WinnerPanelEntry[]>();
  uiHidden = input(false);
  removeRequested = output<string>();

  entriesCount = computed(() => this.entries().length);

  requestRemove(entryId: string): void {
    this.removeRequested.emit(entryId);
  }
}
