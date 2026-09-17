import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Palet } from './child/palet/palet';
import { Background } from './child/background/background';
import { CentraLogo } from './child/centra-logo/centra-logo';
import { SpinRoleTime } from './child/spin-role-time/spin-role-time';
import { FontSettings } from './child/font-settings/font-settings';
import { WinnerList } from './child/winner-list/winner-list';

@Component({
  selector: 'app-color-settings',
  imports: [Palet, Background, CentraLogo, SpinRoleTime, FontSettings, WinnerList],
  templateUrl: './color-settings.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './color-settings.css',
})
export class ColorSettings {}
