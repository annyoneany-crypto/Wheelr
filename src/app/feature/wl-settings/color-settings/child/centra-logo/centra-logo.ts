import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../../../../../services/global_function';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

type CenterLogoTab = 'color' | 'image';

@Component({
  selector: 'app-centra-logo',
  imports: [],
  templateUrl: './centra-logo.html',
  styleUrl: './centra-logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CentraLogo {
  wheelConfigurator = inject(WheelConfigurator);
  selectedTab = signal<CenterLogoTab>('color');
  hasCenterImage = computed(() => this.wheelConfigurator.centerImage().trim().length > 0);

  constructor() {
    effect(() => {
      const activeWheelId = this.wheelConfigurator.activeWheelId();
      if (!activeWheelId) {
        return;
      }

      const storedTab = readJson<CenterLogoTab>(this.tabStorageKey(activeWheelId));
      if (storedTab === 'color' || storedTab === 'image') {
        this.selectedTab.set(storedTab);
        return;
      }

      this.selectedTab.set(this.hasCenterImage() ? 'image' : 'color');
    });
  }

  selectTab(tab: CenterLogoTab): void {
    this.selectedTab.set(tab);
    this.persistSelectedTab(tab);
  }

  onCenterColorChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;

    this.wheelConfigurator.centerColor.set(target.value);
    this.wheelConfigurator.centerImage.set('');
    this.selectTab('color');
  }

  onCenterTextChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;

    const nextValue = target.value.slice(0, 24);
    this.wheelConfigurator.centerText.set(nextValue);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.centerImage.set(result);
        this.selectTab('image');
      }
    };
    reader.readAsDataURL(file);
  }

  onCenterImageUrlEnter(value: string): void {
    const url = value.trim();
    this.wheelConfigurator.centerImage.set(url);
    if (url.length) {
      this.selectTab('image');
    }
  }

  resetCenterLogo(): void {
    this.wheelConfigurator.centerColor.set('#ffffff');
    this.wheelConfigurator.centerText.set('SPIN');
    this.wheelConfigurator.centerImage.set('');
    this.selectTab('color');
  }

  private persistSelectedTab(tab: CenterLogoTab): void {
    const activeWheelId = this.wheelConfigurator.activeWheelId();
    if (!activeWheelId) {
      return;
    }

    writeJson(this.tabStorageKey(activeWheelId), tab);
  }

  private tabStorageKey(activeWheelId: string): string {
    return `giveawayWheel.centerLogoTab.${activeWheelId}`;
  }
}

