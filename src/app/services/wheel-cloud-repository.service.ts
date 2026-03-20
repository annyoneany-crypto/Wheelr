import { Injectable, inject } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  collectionGroup,
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
    const wheelDocRef = requestedCloudId
      ? doc(this.firestore, 'users', user.uid, 'wheels', requestedCloudId)
      : doc(collection(this.firestore, 'users', user.uid, 'wheels'));
    const resolvedCloudId = wheelDocRef.id;

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
      title: typeof name === 'string' && name.trim() ? name.trim() : 'Giveaway Wheel',
      description: typeof description === 'string' ? description.trim() : '',
      displayConfigs: normalizedDisplayConfigs,
    };
  }
}
