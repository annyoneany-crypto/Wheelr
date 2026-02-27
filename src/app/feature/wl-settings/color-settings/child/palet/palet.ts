import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

@Component({
  selector: 'app-palet',
  imports: [FormsModule],
  templateUrl: './palet.html',
  styleUrl: './palet.css',
})
export class Palet {
  wheelConfigurator = inject(WheelConfigurator);

  showCustomPalette = signal(false);

  customName = 'Custom';
  customColors: string[] = ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  colorIndexes = [0, 1, 2, 3, 4, 5];

  toggleCustomPalette(): void {
    this.showCustomPalette.update(v => !v);
  }

  saveCustomPalette(): void {
    const name = this.customName.trim() || 'Custom';
    const colors = this.customColors.filter(c => !!c);
    if (!colors.length) {
      return;
    }

    const newPalette: ColorPalette = { name, colors };
    const palettes = [...this.wheelConfigurator.palettes()];
    const existingIndex = palettes.findIndex(p => p.name === name);

    if (existingIndex > -1) {
      palettes[existingIndex] = newPalette;
    } else {
      palettes.push(newPalette);
    }

    this.wheelConfigurator.palettes.set(palettes);
    this.wheelConfigurator.selectedPalette.set(newPalette);
    this.showCustomPalette.set(false);
  }
}
