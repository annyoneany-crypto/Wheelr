import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NativePlatformService } from '../../services/native-platform.service';

/**
 * The fixed footer with the expandable summary of what Wheelr does.
 *
 * It used to live in `index.html`, outside Angular, which kept it English in
 * every locale and made its links absolute — from `/it/` they led back to the
 * English site. As a component it is translated, prerendered per locale, and
 * routes through `routerLink`, so `<base href>` keeps visitors in their language.
 *
 * Inside the Android shell it is not rendered at all: nothing crawls the app,
 * and a 3rem bar would eat screen the wheel needs. `index.html` still tags the
 * root with `capacitor-native` before first paint, which is what zeroes
 * `--wl-bottom-bar-offset` for the mobile controls.
 */
@Component({
  selector: 'wl-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlSiteFooter {
  protected readonly isNative = inject(NativePlatformService).isNative;

  protected readonly expanded = signal(false);

  protected readonly toggleLabel = computed(() =>
    this.expanded()
      ? $localize`:@@footer.toggle.collapse:Collapse footer summary`
      : $localize`:@@footer.toggle.expand:Expand footer summary`
  );

  /** Search phrases people actually type, in the visitor's language. */
  protected readonly keywords = [
    $localize`:@@footer.kw.1:free wheel`,
    $localize`:@@footer.kw.2:raffle wheel free`,
    $localize`:@@footer.kw.3:spin for prizes free`,
    $localize`:@@footer.kw.4:spin the wheel online`,
    $localize`:@@footer.kw.5:wheel spinner`,
    $localize`:@@footer.kw.6:random picker wheel`,
    $localize`:@@footer.kw.7:yes or no wheel`,
    $localize`:@@footer.kw.8:raffle tool online`,
    $localize`:@@footer.kw.9:wheel of fortune online`,
    $localize`:@@footer.kw.10:random name picker`,
    $localize`:@@footer.kw.11:classroom spinner free`,
    $localize`:@@footer.kw.12:live stream giveaway`,
  ];

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
