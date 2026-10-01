import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMMUNITY_WHEELS, CommunityWheel, frameLayout } from './community-wheels.data';

/**
 * `/community`: the list of community wheels, each opening its own page.
 *
 * The cards show the wheel's frame artwork rather than a drawn preview — the
 * frame is what makes each one recognisable, and it keeps this page free of
 * canvases, so it prerenders exactly as it looks.
 */
@Component({
  selector: 'app-community-wheels',
  imports: [RouterLink],
  templateUrl: './community-wheels.html',
  styleUrl: './community-wheels.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityWheels {
  protected readonly wheels = COMMUNITY_WHEELS;

  protected readonly labels = {
    open: (name: string) => $localize`:@@community.list.openAria:Open the ${name}:NAME: wheel`,
  };

  protected readonly layouts = new Map(
    COMMUNITY_WHEELS.map((wheel) => [wheel.slug, frameLayout(wheel.frame)])
  );

  /** A flat preview of the locked palette, one equal segment per colour. */
  protected previewDisc(wheel: CommunityWheel): string {
    const colors = wheel.palette.colors;
    const step = 360 / colors.length;
    const stops = colors.map((color, index) => `${color} ${index * step}deg ${(index + 1) * step}deg`);
    return `conic-gradient(${stops.join(', ')})`;
  }

  protected cardBackground(color: string, gradient?: string): string {
    return gradient ? `${gradient}, ${color}` : color;
  }
}
