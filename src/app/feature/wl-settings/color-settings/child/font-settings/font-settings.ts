import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

interface FontOption {
  label: string;
  family: string;
  url: string;
}

@Component({
  selector: 'app-font-settings',
  imports: [FormsModule],
  templateUrl: './font-settings.html',
  styleUrl: './font-settings.css',
})
export class FontSettings {
  wheelConfigurator = inject(WheelConfigurator);

  availableFonts: FontOption[] = [
    {
      label: 'Roboto',
      family: 'Roboto, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
    },
    {
      label: 'Lato',
      family: 'Lato, sans-serif',
      url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
    },
    {
        label: 'Pixels',
        family: '"Press Start 2P", system-ui',
        url: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    },
    {
        label: 'Rock Salt',
        family: '"Rock Salt", cursive',
        url: 'https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap',
    },
    {
        label: 'Cinzel Decorative',
        family: '"Cinzel Decorative", serif',
        url: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&display=swap',
    }
  ];

  selectedFamily = signal(this.wheelConfigurator.fontFamily());

  constructor() {
    // keep local selection in sync with service
    effect(() => {
      this.selectedFamily.set(this.wheelConfigurator.fontFamily());
    });
  }

  onSelect(family: string) {
    const opt = this.availableFonts.find(f => f.family === family);
    if (opt) {
      this.wheelConfigurator.setFontFamily(opt.family, opt.url);
    } else {
      this.wheelConfigurator.setFontFamily(family);
    }
  }
}
