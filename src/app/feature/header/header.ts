import { Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../services/wheel-configurator.service';

@Component({
  selector: 'wl-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  wheelConfigurator = inject(WheelConfigurator);
}
