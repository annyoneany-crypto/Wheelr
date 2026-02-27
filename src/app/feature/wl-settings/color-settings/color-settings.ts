import { Component } from '@angular/core';
import { Palet } from './child/palet/palet';
import { Background } from './child/background/background';
import { CentraLogo } from './child/centra-logo/centra-logo';

@Component({
  selector: 'app-color-settings',
  imports: [Palet, Background, CentraLogo],
  templateUrl: './color-settings.html',
  styleUrl: './color-settings.css',
})
export class ColorSettings {}

