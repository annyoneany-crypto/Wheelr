import { Component } from '@angular/core';
import { Palet } from './child/palet/palet';
import { Background } from './child/background/background';
import { CentraLogo } from './child/centra-logo/centra-logo';
import { SpinRoleTime } from './child/spin-role-time/spin-role-time';
import { FontSettings } from './child/font-settings/font-settings';

@Component({
  selector: 'app-color-settings',
  imports: [Palet, Background, CentraLogo, SpinRoleTime, FontSettings],
  templateUrl: './color-settings.html',
  styleUrl: './color-settings.css',
})
export class ColorSettings {}

