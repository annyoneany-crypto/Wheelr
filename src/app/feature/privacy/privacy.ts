import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {
  /** Shown in the header and in the "last updated" line. */
  protected readonly lastUpdated = '8 August 2026';
  /** Where privacy and data-deletion requests are handled. */
  protected readonly contactEmail = 'privacy@wheelr.xyz';
}
