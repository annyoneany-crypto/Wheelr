import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

@Component({
  selector: 'app-winner-list',
  templateUrl: './winner-list.html',
  styleUrl: './winner-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnerList {
  wheelConfigurator = inject(WheelConfigurator);

  toggleLabel(): string {
    return this.wheelConfigurator.showWinnersList()
      ? $localize`:@@winnerList.show:Show winners list`
      : $localize`:@@winnerList.hide:Hide winners list`;
  }
}
