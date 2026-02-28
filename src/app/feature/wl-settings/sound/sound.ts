import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'app-sound',
  imports: [FormsModule],
  templateUrl: './sound.html',
  styleUrl: './sound.css',
})
export class Sound {
  wheelConfigurator = inject(WheelConfigurator);

  /**
   * Handle audio file selection.
   * Reads the file as data URL and stores in IndexDB via the service.
   */
  onAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Validate file is audio
    if (!file.type.startsWith('audio/')) {
      console.warn('Selected file is not audio', file.type);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.setCustomAudio(result);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Clear the stored custom audio and reset to default.
   */
  clearCustomAudio(): void {
    this.wheelConfigurator.setCustomAudio('');
  }

  /**
   * Handle winner audio file selection.
   * Reads the file as data URL and stores in IndexDB via the service.
   */
  onWinnerAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Validate file is audio
    if (!file.type.startsWith('audio/')) {
      console.warn('Selected file is not audio', file.type);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.setWinnerAudio(result);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Clear the stored winner audio.
   */
  clearWinnerAudio(): void {
    this.wheelConfigurator.setWinnerAudio('');
  }

  /**
   * Handle countdown audio file selection.
   */
  onCountdownAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      console.warn('Selected file is not audio', file.type);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.wheelConfigurator.setCountdownAudio(result);
      }
    };
    reader.readAsDataURL(file);
  }

  clearCountdownAudio(): void {
    this.wheelConfigurator.setCountdownAudio('');
  }
}
