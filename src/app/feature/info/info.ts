import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-info',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './info.html',
  styleUrl: './info.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Info {}
