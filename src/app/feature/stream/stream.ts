import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing page for streamers.
 *
 * The workflow it documents is the one that actually works today: hide the
 * interface, capture the browser window, spin on camera. The transparent
 * `?nobg=true` view is presented as what it is — a read-only display, since the
 * shared wheel has no spin of its own.
 */
@Component({
  selector: 'app-stream',
  imports: [RouterLink],
  templateUrl: './stream.html',
  styleUrl: './stream.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stream {}
