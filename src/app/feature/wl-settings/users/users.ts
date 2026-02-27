import { Component, inject, linkedSignal, signal } from '@angular/core';
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
  repeatCount = signal(1);

  usersText = linkedSignal<string>(() => {
    return this.wheelConfigurator.names().join('\r\n');
  });


  userTextChange(e: string): void {
    this.wheelConfigurator.setNames(e.split(/\r?\n/));
  }

  shuffleUsers(): void {
    this.wheelConfigurator.shuffleNames();
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
}
