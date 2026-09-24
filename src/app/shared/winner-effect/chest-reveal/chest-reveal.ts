import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Premium winner effect: three velvet caskets drop in, the middle one shakes and
 * flips its lid open, and the winner card (owned by `FireEffect`) rises out of it.
 *
 * Pure CSS 3D and keyframes, all timed from mount — the component only exists
 * while a winner is on screen. The coin and sparkle burst is drawn by
 * `FireEffect` on its canvas, aimed at the element marked `data-chest-mouth`.
 * The timings below and `CHEST_OPEN_MS` in `FireEffect` have to agree.
 */
@Component({
  selector: 'wl-chest-reveal',
  templateUrl: './chest-reveal.html',
  styleUrl: './chest-reveal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'wlc-stage', 'aria-hidden': 'true' },
})
export class ChestReveal {
  protected readonly chests = [
    { main: false, delay: '0.15s' },
    { main: true, delay: '0s' },
    { main: false, delay: '0.3s' },
  ];
}
