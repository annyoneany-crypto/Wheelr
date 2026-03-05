import { Component, computed, inject, signal } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'app-wheel-manager',
  templateUrl: './wheel-manager.html',
  styleUrl: './wheel-manager.css',
})
export class WheelManager {
  wheelConfigurator = inject(WheelConfigurator);
  managerWorkspaces = computed(() => this.wheelConfigurator.managerWheelWorkspaces());

  isManagerWorkspaceActive(workspaceId: string): boolean {
    return this.wheelConfigurator.getWorkspaceRootId(this.wheelConfigurator.activeWheelId()) === workspaceId;
  }

  createName = signal('');
  createDescription = signal('');

  editingWheelId = signal<string | null>(null);
  editName = signal('');
  editDescription = signal('');

  updateCreateName(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.createName.set(target.value);
  }

  updateCreateDescription(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.createDescription.set(target.value);
  }

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

  async createWheel(): Promise<void> {
    const name = this.createName().trim();
    if (!name) {
      return;
    }

    await this.wheelConfigurator.createWheelWorkspace(name, this.createDescription());
    this.createName.set('');
    this.createDescription.set('');
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
