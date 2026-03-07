import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../../../../../services/global_function';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

type BackgroundTab = 'color' | 'image';

@Component({
  selector: 'app-background',
  imports: [],
  templateUrl: './background.html',
  styleUrl: './background.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Background {
  wheelConfigurator = inject(WheelConfigurator);
  selectedTab = signal<BackgroundTab>('color');
  hasBgImage = computed(() => this.wheelConfigurator.bgImage().trim().length > 0);

  constructor() {
    effect(() => {
      const activeWheelId = this.wheelConfigurator.activeWheelId();
      if (!activeWheelId) {
        return;
      }

      const storedTab = readJson<BackgroundTab>(this.tabStorageKey(activeWheelId));
      if (storedTab === 'color' || storedTab === 'image') {
        this.selectedTab.set(storedTab);
        return;
      }

      // Fallback for legacy sessions: use image tab if a background image exists.
      this.selectedTab.set(this.hasBgImage() ? 'image' : 'color');
    });
  }

  selectTab(tab: BackgroundTab): void {
    this.selectedTab.set(tab);
    this.persistSelectedTab(tab);
  }

  onBgColorChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;

    this.wheelConfigurator.bgColor.set(target.value);
    this.wheelConfigurator.bgImage.set('');
    this.selectTab('color');
  }

  onBgFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.bgImage.set(result);
        this.selectTab('image');
      }
    };
    reader.readAsDataURL(file);
  }

  resetBackground(): void {
    this.wheelConfigurator.bgColor.set('#0f172a');
    this.wheelConfigurator.bgImage.set('');
    this.wheelConfigurator.clearImagesStorage();
    this.selectTab('color');
  }

  private persistSelectedTab(tab: BackgroundTab): void {
    const activeWheelId = this.wheelConfigurator.activeWheelId();
    if (!activeWheelId) {
      return;
    }

    writeJson(this.tabStorageKey(activeWheelId), tab);
  }

  private tabStorageKey(activeWheelId: string): string {
    const rootWorkspaceId = this.wheelConfigurator.getWorkspaceRootId(activeWheelId);
    return `giveawayWheel.backgroundTab.${rootWorkspaceId}`;
  }
}

