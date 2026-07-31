import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { WheelCloudRepository } from './wheel-cloud-repository.service';
import { WheelConfigurator } from './wheel-configurator.service';

export type CloudSyncState = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Pulls the signed-in user's wheels down from Firestore as soon as a session is available,
 * so the local wheel list mirrors the cloud one without any manual import step.
 */
@Injectable({
  providedIn: 'root',
})
export class WheelCloudSync {
  private readonly authService = inject(AuthService);
  private readonly wheelCloudRepository = inject(WheelCloudRepository);
  private readonly wheelConfigurator = inject(WheelConfigurator);

  private lastSyncedUid = '';
  private inFlightSync: Promise<void> | null = null;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly state = signal<CloudSyncState>('idle');
  readonly message = signal('');

  constructor() {
    effect(() => {
      const uid = this.authService.user()?.uid ?? '';

      if (!uid) {
        // Signing out clears the marker so the next sign-in syncs again.
        this.lastSyncedUid = '';
        return;
      }

      if (uid === this.lastSyncedUid) {
        return;
      }

      this.lastSyncedUid = uid;
      untracked(() => void this.syncFromCloud());
    });
  }

  /**
   * Callers that need the local wheel list to be settled (e.g. a save queued behind login)
   * can await this: concurrent callers join the single in-flight run instead of starting
   * a second one.
   */
  syncFromCloud(): Promise<void> {
    if (!this.inFlightSync) {
      this.inFlightSync = this.runSync().finally(() => {
        this.inFlightSync = null;
      });
    }

    return this.inFlightSync;
  }

  private async runSync(): Promise<void> {
    this.clearFeedbackTimeout();
    this.state.set('syncing');
    this.message.set('Syncing wheels...');

    try {
      const cloudWheels = await this.wheelCloudRepository.listCurrentUserWheels();
      const { imported, removed } = await this.wheelConfigurator.syncCloudWheelsToLocal(cloudWheels);

      this.setFeedback('success', this.buildSummary(imported, removed));
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'AUTH_REQUIRED'
          ? 'Sign in to sync your wheels.'
          : 'Could not sync wheels from cloud.';
      this.setFeedback('error', message);

      // Let a later attempt retry instead of being swallowed by the uid guard.
      this.lastSyncedUid = '';
    }
  }

  private buildSummary(imported: number, removed: number): string {
    if (!imported && !removed) {
      return 'Wheels are up to date.';
    }

    const parts: string[] = [];
    if (imported) {
      parts.push(`${imported} synced`);
    }
    if (removed) {
      parts.push(`${removed} removed`);
    }

    return `Cloud wheels: ${parts.join(', ')}.`;
  }

  private setFeedback(state: 'success' | 'error', message: string): void {
    this.clearFeedbackTimeout();
    this.state.set(state);
    this.message.set(message);

    this.feedbackTimeout = setTimeout(
      () => {
        this.feedbackTimeout = null;
        this.state.set('idle');
        this.message.set('');
      },
      state === 'error' ? 5000 : 3000
    );
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }
}
