export class WheelAudioManager {
  private spinAudioElement: HTMLAudioElement | undefined;
  private winnerAudioElement: HTMLAudioElement | undefined;
  private countdownAudioElement: HTMLAudioElement | undefined;

  playSpinAudio(audioData: string): void {
    try {
      if (this.spinAudioElement) {
        this.spinAudioElement.pause();
        this.spinAudioElement.currentTime = 0;
      }

      this.spinAudioElement = new Audio(audioData);
      this.spinAudioElement.play().catch(() => {
        // Ignore browser autoplay restrictions.
      });
    } catch (error) {
      console.warn('Failed to play spin audio', error);
    }
  }

  playWinnerAudio(audioData: string): void {
    try {
      if (this.winnerAudioElement) {
        this.winnerAudioElement.pause();
        this.winnerAudioElement.currentTime = 0;
      }

      this.winnerAudioElement = new Audio(audioData);
      this.winnerAudioElement.play().catch(() => {
        // Ignore browser autoplay restrictions.
      });
    } catch (error) {
      console.warn('Failed to play winner audio', error);
    }
  }

  preloadCountdownAudio(audioData: string): void {
    try {
      this.countdownAudioElement = new Audio(audioData);
      this.countdownAudioElement.preload = 'auto';
    } catch (error) {
      console.warn('Failed to pre-load countdown audio', error);
    }
  }

  clearCountdownAudio(): void {
    if (!this.countdownAudioElement) {
      return;
    }

    this.countdownAudioElement.pause();
    this.countdownAudioElement = undefined;
  }

  playCountdownAudio(): void {
    try {
      if (!this.countdownAudioElement) {
        return;
      }

      this.countdownAudioElement.currentTime = 0;
      this.countdownAudioElement.play().catch(() => {
        // Ignore browser autoplay restrictions.
      });
    } catch (error) {
      console.warn('Failed to play countdown audio', error);
    }
  }
}
