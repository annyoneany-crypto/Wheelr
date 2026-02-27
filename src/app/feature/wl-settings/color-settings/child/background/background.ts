import { Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

@Component({
  selector: 'app-background',
  imports: [],
  templateUrl: './background.html',
  styleUrl: './background.css',
})
export class Background {
  wheelConfigurator = inject(WheelConfigurator);

  onBgColorChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;

    this.wheelConfigurator.bgColor.set(target.value);
    this.wheelConfigurator.bgImage.set('');
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
      }
    };
    reader.readAsDataURL(file);
  }

  resetBackground(): void {
    this.wheelConfigurator.bgColor.set('#0f172a');
    this.wheelConfigurator.bgImage.set('');
    this.wheelConfigurator.clearImagesStorage();
  }
}

