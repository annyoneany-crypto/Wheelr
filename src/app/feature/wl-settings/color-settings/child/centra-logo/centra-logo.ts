import { Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

@Component({
  selector: 'app-centra-logo',
  imports: [],
  templateUrl: './centra-logo.html',
  styleUrl: './centra-logo.css',
})
export class CentraLogo {
  wheelConfigurator = inject(WheelConfigurator);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.centerImage.set(result);
      }
    };
    reader.readAsDataURL(file);
  }
}

