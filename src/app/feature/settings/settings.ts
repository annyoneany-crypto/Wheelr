import { Component, inject, output } from '@angular/core';
import { WheelConfigurator } from '../../services/wheel-configurator.service';

@Component({
  selector: 'wl-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  wheelConfigurator = inject(WheelConfigurator);
  onClose = output<void>();

  onBgColorChange(event: any) { 
    this.wheelConfigurator.bgColor.set(event.target.value); 
    this.wheelConfigurator.bgImage.set(''); 
  }
  onBgFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => this.wheelConfigurator.bgImage.set(e.target.result);
      reader.readAsDataURL(file);
    }
  }
  resetBackground() { 
    this.wheelConfigurator.bgColor.set('#0f172a'); 
    this.wheelConfigurator.bgImage.set(''); 
  }
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => this.wheelConfigurator.centerImage.set(e.target.result);
      reader.readAsDataURL(file);
    }
  }
  addName(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val && this.wheelConfigurator.names().length < 100) { 
      this.wheelConfigurator.names.update(n => [...n, val]);
      input.value = ''; 
    }
  }
  removeName(index: number) { 
    this.wheelConfigurator.names.update(n => n.filter((_, i) => i !== index)); 
  }

}
