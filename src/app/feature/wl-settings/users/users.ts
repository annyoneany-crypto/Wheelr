import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'app-users',
  imports: [
    FormsModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  wheelConfigurator = inject(WheelConfigurator);
  
  // fields for the "add name N times" feature
  newName = signal('');
  nameToRemove = signal('');
  repeatCount = signal(1);

  usersText = linkedSignal<string>(() => {
    return this.wheelConfigurator.names().join('\r\n');
  });


  userTextChange(e: string): void {
    this.wheelConfigurator.setNames(e.split(/\r?\n/));
  }

  /**
   * Add the current value of `newName` repeating it `repeatCount` times
   * to the list managed by the configurator.  Empty strings are ignored
   * and the count is clamped to a minimum of 1.
   */
  addRepeated(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }

    const count = Math.max(1, Math.floor(this.repeatCount()));
    const current = this.wheelConfigurator.names();
    const updated = [...current];
    for (let i = 0; i < count; i++) {
      updated.push(name);
    }

    this.wheelConfigurator.setNames(updated);

    // reset inputs
    this.newName.set('');
    this.repeatCount.set(1);
  }

  cleanAndShuffleUsers(): void {
    const cleaned = this.wheelConfigurator
      .names()
      .map(n => n.trim())
      .filter(Boolean);

    this.wheelConfigurator.setNames(cleaned);
    this.wheelConfigurator.shuffleNames();
  }

  clearUsers(): void {
    this.wheelConfigurator.setNames([]);
  }

  removeNameFromUsers(): void {
    const name = this.nameToRemove();
    if (!name) {
      return;
    }

    const filteredNames = this.wheelConfigurator
      .names()
      .filter((n) => n !== name);

    this.wheelConfigurator.setNames(filteredNames);
  }

  // ----- Hidden section: preset winners -----

  hiddenSectionOpen = signal(false);

  /** Unique names on the wheel with how many slices each occupies. */
  nameSummary = computed(() => {
    const counts = new Map<string, number>();
    for (const name of this.wheelConfigurator.names()) {
      if (!name.trim()) {
        continue;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  });

  toggleHiddenSection(): void {
    this.hiddenSectionOpen.update((open) => !open);
  }

  isPresetWinner(name: string): boolean {
    return this.wheelConfigurator.presetWinners().includes(name);
  }

  addPresetWinner(name: string): void {
    if (this.isPresetWinner(name)) {
      return;
    }
    this.wheelConfigurator.setPresetWinners([...this.wheelConfigurator.presetWinners(), name]);
  }

  removePresetWinner(index: number): void {
    this.wheelConfigurator.setPresetWinners(
      this.wheelConfigurator.presetWinners().filter((_, i) => i !== index)
    );
  }

  movePresetWinner(index: number, delta: number): void {
    const queue = [...this.wheelConfigurator.presetWinners()];
    const target = index + delta;
    if (target < 0 || target >= queue.length) {
      return;
    }
    const [moved] = queue.splice(index, 1);
    queue.splice(target, 0, moved);
    this.wheelConfigurator.setPresetWinners(queue);
  }

  clearPresetWinners(): void {
    this.wheelConfigurator.setPresetWinners([]);
  }
}
