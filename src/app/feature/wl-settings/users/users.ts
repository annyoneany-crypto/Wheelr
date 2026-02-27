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
  
  usersText = linkedSignal<string>(() => {
    return this.wheelConfigurator.names().join('\r\n');
  });


  userTextChange(e: string): void {
    this.wheelConfigurator.setNames(e.split(/\r?\n/));
  }

  shuffleUsers(): void {
    this.wheelConfigurator.shuffleNames();
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
