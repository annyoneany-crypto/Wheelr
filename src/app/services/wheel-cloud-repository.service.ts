import { Injectable, inject } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { firebaseAuthConfig } from './firebase-auth.config';
import { AuthService } from './auth.service';
import { WheelDisplayConfig, WheelWorkspaceMeta } from './wheel-configurator.models';

interface WheelCloudPayload {
  workspace: WheelWorkspaceMeta;
  displayConfigs: WheelDisplayConfig[];
  cloudConfigId?: string;
}

export interface WheelPublicData {
  title: string;
  description: string;
  displayConfigs: WheelDisplayConfig[];
}

export interface CloudWheelSyncItem {
  cloudConfigId: string;
  workspaceId: string;
  title: string;
  description: string;
  displayConfigs: WheelDisplayConfig[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class WheelCloudRepository {
  private readonly authService = inject(AuthService);
  private firestore = getFirestore(this.resolveApp());

  async getWheelDisplayConfigById(configId: string): Promise<WheelPublicData | null> {
    const normalizedId = configId?.trim() ?? '';
    if (!normalizedId) {
      return null;
    }

    const byCloudConfigId = query(
      collectionGroup(this.firestore, 'wheels'),
      where('cloudConfigId', '==', normalizedId),
      limit(1)
    );
    const byCloudConfigIdSnapshot = await getDocs(byCloudConfigId);
    const byCloudConfigDoc = byCloudConfigIdSnapshot.docs[0];
    if (byCloudConfigDoc) {
      return this.extractPublicData(byCloudConfigDoc.data());
    }

    const byWorkspaceId = query(
      collectionGroup(this.firestore, 'wheels'),
      where('workspaceId', '==', normalizedId),
      limit(1)
    );
    const byWorkspaceSnapshot = await getDocs(byWorkspaceId);
    const fallbackDoc = byWorkspaceSnapshot.docs[0];

    if (!fallbackDoc) {
      return null;
    }

    return this.extractPublicData(fallbackDoc.data());
  }

  async upsertWheel(payload: WheelCloudPayload): Promise<string> {
    const user = this.authService.user();

    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }

    const requestedCloudId = payload.cloudConfigId?.trim() ?? '';
    const resolvedCloudId = await this.resolveUniqueCloudConfigId(
      user.uid,
      requestedCloudId
    );
    const wheelDocRef = doc(this.firestore, 'users', user.uid, 'wheels', resolvedCloudId);

    const displayConfigs = payload.displayConfigs.length
      ? payload.displayConfigs
      : [];
    const compressedDisplayConfigs = await Promise.all(
      displayConfigs.map((config) => this.compressDisplayConfig(config))
    );
    const primaryDisplayConfig = compressedDisplayConfigs[0] ?? null;

    await setDoc(
      wheelDocRef,
      {
        cloudConfigId: resolvedCloudId,
        workspaceId: payload.workspace.id,
        name: payload.workspace.name,
        description: payload.workspace.description,
        createdAt: payload.workspace.createdAt,
        updatedAt: payload.workspace.updatedAt,
        ownerUid: user.uid,
        ownerEmail: user.email ?? '',
        displayConfig: primaryDisplayConfig,
        displayConfigs: compressedDisplayConfigs,
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return resolvedCloudId;
  }

  async listCurrentUserWheels(): Promise<CloudWheelSyncItem[]> {
    const user = this.authService.user();
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }

    const wheelsCollection = collection(this.firestore, 'users', user.uid, 'wheels');
    const snapshot = await getDocs(wheelsCollection);

    return snapshot.docs
      .map((entry) => this.extractCloudSyncItem(entry.data()))
      .filter((item): item is CloudWheelSyncItem => !!item);
  }

  async deleteWheelByCloudConfigId(cloudConfigId: string): Promise<void> {
    const user = this.authService.user();
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }

    const normalizedCloudId = cloudConfigId?.trim() ?? '';
    if (!normalizedCloudId) {
      return;
    }

    const existing = query(
      collectionGroup(this.firestore, 'wheels'),
      where('cloudConfigId', '==', normalizedCloudId),
      where('ownerUid', '==', user.uid)
    );
    const snapshot = await getDocs(existing);

    if (snapshot.empty) {
      return;
    }

    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  }

  private async resolveUniqueCloudConfigId(
    userUid: string,
    requestedCloudId: string
  ): Promise<string> {
    if (requestedCloudId) {
      const duplicate = await this.findByCloudConfigId(requestedCloudId);
      if (!duplicate) {
        return requestedCloudId;
      }

      const duplicateData = duplicate.data() as { ownerUid?: unknown };
      const duplicateOwnerUid = typeof duplicateData.ownerUid === 'string' ? duplicateData.ownerUid : '';

      // If the id already belongs to the same user, keep it stable across local workspace changes.
      if (duplicateOwnerUid === userUid) {
        return requestedCloudId;
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = doc(collection(this.firestore, 'users', userUid, 'wheels')).id;
      const duplicate = await this.findByCloudConfigId(candidate);
      if (!duplicate) {
        return candidate;
      }
    }

    throw new Error('UNIQUE_KEY_GENERATION_FAILED');
  }

  private async findByCloudConfigId(cloudConfigId: string) {
    const check = query(
      collectionGroup(this.firestore, 'wheels'),
      where('cloudConfigId', '==', cloudConfigId),
      limit(1)
    );
    const snapshot = await getDocs(check);
    return snapshot.docs[0] ?? null;
  }

  private async compressDisplayConfig(displayConfig: WheelDisplayConfig): Promise<WheelDisplayConfig> {
    const [compressedBgImage, compressedCenterImage] = await Promise.all([
      this.compressImageDataUrl(displayConfig.bgImage, 1280, 0.72),
      this.compressImageDataUrl(displayConfig.centerImage, 512, 0.8),
    ]);

    return {
      ...displayConfig,
      bgImage: compressedBgImage,
      centerImage: compressedCenterImage,
    };
  }

  private async compressImageDataUrl(dataUrl: string, maxDimension: number, quality: number): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }

    const image = await this.loadImage(dataUrl);
    if (!image) {
      return dataUrl;
    }

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return dataUrl;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressed = canvas.toDataURL('image/webp', quality);
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  }

  private resolveApp(): FirebaseApp {
    return getApps().length ? getApp() : initializeApp(firebaseAuthConfig);
  }

  private extractPublicData(data: unknown): WheelPublicData | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const source = data as {
      displayConfigs?: unknown;
      displayConfig?: unknown;
      name?: unknown;
      description?: unknown;
    };

    const listFromPayload = Array.isArray(source.displayConfigs)
      ? source.displayConfigs.filter((item) => !!item && typeof item === 'object')
      : [];

    const legacySingle = source.displayConfig && typeof source.displayConfig === 'object'
      ? [source.displayConfig]
      : [];

    const normalizedDisplayConfigs = (listFromPayload.length ? listFromPayload : legacySingle) as WheelDisplayConfig[];

    if (!normalizedDisplayConfigs.length) {
      return null;
    }

    const { name, description } = source;

    return {
      title: typeof name === 'string' && name.trim() ? name.trim() : 'Wheel',
      description: typeof description === 'string' ? description.trim() : '',
      displayConfigs: normalizedDisplayConfigs,
    };
  }

  private extractCloudSyncItem(data: unknown): CloudWheelSyncItem | null {
    const publicData = this.extractPublicData(data);
    if (!publicData || !data || typeof data !== 'object') {
      return null;
    }

    const source = data as {
      cloudConfigId?: unknown;
      workspaceId?: unknown;
      name?: unknown;
      description?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
    };

    const cloudConfigId = typeof source.cloudConfigId === 'string' ? source.cloudConfigId.trim() : '';
    if (!cloudConfigId) {
      return null;
    }

    const workspaceId = typeof source.workspaceId === 'string' && source.workspaceId.trim()
      ? source.workspaceId.trim()
      : cloudConfigId;

    return {
      cloudConfigId,
      workspaceId,
      title: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : publicData.title,
      description: typeof source.description === 'string' ? source.description.trim() : publicData.description,
      displayConfigs: publicData.displayConfigs,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString(),
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
    };
  }
}
