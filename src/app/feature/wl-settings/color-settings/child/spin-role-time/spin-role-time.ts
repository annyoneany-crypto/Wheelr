import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

@Component({
  selector: 'app-spin-role-time',
  imports: [FormsModule],
  templateUrl: './spin-role-time.html',
  styleUrl: './spin-role-time.css',
})
export class SpinRoleTime {
  wheelConfigurator = inject(WheelConfigurator);

  /**
   * Duration expressed in seconds.  Backing store in configurator is ms.
   * The getter/setter allows two-way binding from the template.
   */
  get durationSec(): number {
    return Math.round(this.wheelConfigurator.spinDurationMs() / 1000);
  }
  set durationSec(val: number) {
    let secs = Math.floor(val);
    if (isNaN(secs) || secs < 1) secs = 1;
    this.wheelConfigurator.spinDurationMs.set(secs * 1000);
  }
}
