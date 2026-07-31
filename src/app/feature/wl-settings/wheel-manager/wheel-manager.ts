import { Component, computed, inject, signal } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import { WheelCloudRepository } from '../../../services/wheel-cloud-repository.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-wheel-manager',
  templateUrl: './wheel-manager.html',
  styleUrl: './wheel-manager.css',
})
export class WheelManager {
  wheelConfigurator = inject(WheelConfigurator);
  private readonly wheelCloudRepository = inject(WheelCloudRepository);
  protected readonly authService = inject(AuthService);
  managerWorkspaces = computed(() => this.wheelConfigurator.managerWheelWorkspaces());

  isManagerWorkspaceActive(workspaceId: string): boolean {
    return this.wheelConfigurator.getWorkspaceRootId(this.wheelConfigurator.activeWheelId()) === workspaceId;
  }

  editingWheelId = signal<string | null>(null);
  editName = signal('');
  editDescription = signal('');
  savingWorkspaceId = signal<string | null>(null);
  syncedWorkspaceId = signal<string | null>(null);
  importingFromCloud = signal(false);
  importedFromCloudCount = signal<number | null>(null);
  cloudError = signal('');

  updateEditName(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.editName.set(target.value);
  }

  updateEditDescription(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.editDescription.set(target.value);
  }

  async saveWheelToCloud(workspaceId: string): Promise<void> {
    if (this.savingWorkspaceId() === workspaceId) {
      return;
    }

    const workspace = this.managerWorkspaces().find((item) => item.id === workspaceId);
    if (!workspace) {
      return;
    }

    this.cloudError.set('');
    this.syncedWorkspaceId.set(null);
    this.savingWorkspaceId.set(workspaceId);

    try {
      const rootWorkspaceId = this.wheelConfigurator.getWorkspaceRootId(workspace.id);
      const displayConfigs = await this.wheelConfigurator.loadWheelGroupDisplayConfigs(rootWorkspaceId);
      if (!displayConfigs.length) {
        this.cloudError.set('Wheel configuration not found. Load the wheel and try again.');
        return;
      }

      const cloudConfigId = await this.wheelCloudRepository.upsertWheel({
        workspace,
        displayConfigs,
        cloudConfigId: workspace.cloudConfigId,
      });

      this.wheelConfigurator.setGroupCloudConfigId(rootWorkspaceId, cloudConfigId);

      this.syncedWorkspaceId.set(workspaceId);
    } catch (error) {
      const message = error instanceof Error && error.message === 'AUTH_REQUIRED'
        ? 'Sign in to save the wheel to cloud.'
        : 'Cloud save failed. Try again.';
      this.cloudError.set(message);
    } finally {
      this.savingWorkspaceId.set(null);
    }
  }

  async importWheelsFromCloud(): Promise<void> {
    if (this.importingFromCloud()) {
      return;
    }

    this.cloudError.set('');
    this.importedFromCloudCount.set(null);
    this.importingFromCloud.set(true);

    try {
      const cloudWheels = await this.wheelCloudRepository.listCurrentUserWheels();
      const { imported } = await this.wheelConfigurator.syncCloudWheelsToLocal(cloudWheels);
      this.importedFromCloudCount.set(imported);
    } catch (error) {
      const message = error instanceof Error && error.message === 'AUTH_REQUIRED'
        ? 'Sign in to import wheels from cloud.'
        : 'Cloud import failed. Try again.';
      this.cloudError.set(message);
    } finally {
      this.importingFromCloud.set(false);
    }
  }

  async loadWheel(workspaceId: string): Promise<void> {
    await this.wheelConfigurator.loadWheelWorkspace(workspaceId);
    this.cancelRename();
  }

  startRename(workspaceId: string): void {
    const workspace = this.managerWorkspaces().find((item) => item.id === workspaceId);

    if (!workspace) {
      return;
    }

    this.editingWheelId.set(workspaceId);
    this.editName.set(workspace.name);
    this.editDescription.set(workspace.description);
  }

  saveRename(): void {
    const workspaceId = this.editingWheelId();
    if (!workspaceId) {
      return;
    }

    const renamed = this.wheelConfigurator.renameWheelWorkspace(
      workspaceId,
      this.editName(),
      this.editDescription()
    );

    if (renamed) {
      this.cancelRename();
    }
  }

  cancelRename(): void {
    this.editingWheelId.set(null);
    this.editName.set('');
    this.editDescription.set('');
  }

  async deleteWheel(workspaceId: string): Promise<void> {
    const workspace = this.managerWorkspaces().find((item) => item.id === workspaceId);
    if (!workspace) {
      return;
    }

    const confirmed = window.confirm(`Delete wheel "${workspace.name}"?`);
    if (!confirmed) {
      return;
    }

    this.cloudError.set('');

    try {
      if (workspace.cloudConfigId) {
        await this.wheelCloudRepository.deleteWheelByCloudConfigId(workspace.cloudConfigId);
      }
    } catch (error) {
      const message = error instanceof Error && error.message === 'AUTH_REQUIRED'
        ? 'Sign in to also delete the wheel from cloud.'
        : 'Cloud deletion failed. Try again.';
      this.cloudError.set(message);
      console.error('Error deleting wheel from cloud:', error);
      return;
    }

    await this.wheelConfigurator.deleteWheelWorkspace(workspaceId);

    if (this.editingWheelId() === workspaceId) {
      this.cancelRename();
    }
  }

  decreaseVisibleWheels(): void {
    this.wheelConfigurator.setVisibleWheelCount(this.wheelConfigurator.visibleWheelCount() - 1);
  }

  async increaseVisibleWheels(): Promise<void> {
    const nextVisibleCount = Math.min(4, this.wheelConfigurator.visibleWheelCount() + 1);
    const currentActiveId = this.wheelConfigurator.activeWheelId();
    const rootWorkspaceId = this.wheelConfigurator.getWorkspaceRootId(currentActiveId);

    while (this.wheelConfigurator.getWorkspaceGroupIds(rootWorkspaceId, 99).length < nextVisibleCount) {
      await this.wheelConfigurator.createGroupedWheelWorkspace(rootWorkspaceId);
    }

    if (currentActiveId) {
      await this.wheelConfigurator.loadWheelWorkspace(currentActiveId);
    }

    this.wheelConfigurator.setVisibleWheelCount(nextVisibleCount);
  }
}
