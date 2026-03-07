import {
  ColorPalette,
  DEFAULT_PALETTES,
  openDb,
  readImage,
  readJson,
  STORAGE_KEYS,
  writeJson,
} from './global_function';
import {
  ActiveWheelSnapshotState,
  WheelDisplayConfig,
  WheelSettingsSnapshot,
  WheelSnapshotEntry,
  WheelWorkspaceMeta,
} from './wheel-configurator.models';

export function storageKeyForWorkspace(baseKey: string, workspaceId: string): string {
  return `${baseKey}.${workspaceId}`;
}

export function clearWorkspaceStorage(workspaceId: string): void {
  const allKeys = Object.values(STORAGE_KEYS);
  for (const key of allKeys) {
    localStorage.removeItem(storageKeyForWorkspace(key, workspaceId));
  }
}

export async function clearWorkspaceIndexedDb(workspaceId: string): Promise<void> {
  const mediaKeys = [
    STORAGE_KEYS.bgImage,
    STORAGE_KEYS.centerImage,
    STORAGE_KEYS.customAudio,
    STORAGE_KEYS.winnerAudio,
    STORAGE_KEYS.countdownAudio,
  ];

  for (const key of mediaKeys) {
    await deleteImage(storageKeyForWorkspace(key, workspaceId));
  }
}

async function deleteImage(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // ignore failures
  }
}

export function readSnapshotEntryFromStorage(meta: WheelWorkspaceMeta): WheelSnapshotEntry {
  const workspaceId = meta.id;
  const palettes =
    readJson<ColorPalette[]>(storageKeyForWorkspace(STORAGE_KEYS.palettes, workspaceId)) ??
    DEFAULT_PALETTES;
  const selectedPaletteName =
    readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.selectedPaletteName, workspaceId)) ??
    palettes[0]?.name ??
    DEFAULT_PALETTES[0].name;
  const names = readJson<string[]>(storageKeyForWorkspace(STORAGE_KEYS.names, workspaceId)) ?? [];
  const centerLogoSize =
    readJson<'s' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'>(
      storageKeyForWorkspace(STORAGE_KEYS.centerLogoSize, workspaceId)
    ) ?? 'm';
  const wheelView =
    readJson<'wheel' | 'linear' | 'cards'>(storageKeyForWorkspace(STORAGE_KEYS.wheelView, workspaceId)) ??
    'wheel';
  const spinDurationMs =
    readJson<number>(storageKeyForWorkspace(STORAGE_KEYS.spinDurationMs, workspaceId)) ?? 3000;
  const soundEnabled =
    readJson<boolean>(storageKeyForWorkspace(STORAGE_KEYS.soundEnabled, workspaceId)) ?? true;
  const countdownEnabled =
    readJson<boolean>(storageKeyForWorkspace(STORAGE_KEYS.countdownEnabled, workspaceId)) ?? false;
  const countdownStart =
    readJson<number>(storageKeyForWorkspace(STORAGE_KEYS.countdownStart, workspaceId)) ?? 3;
  const fontFamily =
    readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.fontFamily, workspaceId)) ??
    '"Inter", sans-serif';
  const fontLink =
    readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.fontLink, workspaceId)) ??
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
  const visibleWheelCount =
    readJson<number>(storageKeyForWorkspace(STORAGE_KEYS.visibleWheelCount, workspaceId)) ?? 1;

  return {
    wheelID: workspaceId,
    name: meta.name,
    description: meta.description,
    palettes,
    selectedPaletteName,
    names,
    centerLogoSize,
    wheelView,
    spinDurationMs,
    soundEnabled,
    countdownEnabled,
    countdownStart,
    fontFamily,
    fontLink,
    visibleWheelCount: Math.min(4, Math.max(1, Math.floor(visibleWheelCount))),
  };
}

export function buildSnapshotEntryFromState(state: ActiveWheelSnapshotState): WheelSnapshotEntry {
  return {
    wheelID: state.workspace.id,
    name: state.workspace.name,
    description: state.workspace.description,
    palettes: state.palettes,
    selectedPaletteName: state.selectedPaletteName,
    names: state.names,
    centerLogoSize: state.centerLogoSize,
    wheelView: state.wheelView,
    spinDurationMs: state.spinDurationMs,
    soundEnabled: state.soundEnabled,
    countdownEnabled: state.countdownEnabled,
    countdownStart: state.countdownStart,
    fontFamily: state.fontFamily,
    fontLink: state.fontLink,
    visibleWheelCount: state.visibleWheelCount,
  };
}

export function saveUnifiedLocalStorageSnapshot(params: {
  activeId: string;
  bgColor: string;
  wheelWorkspaces: WheelWorkspaceMeta[];
  activeEntry: WheelSnapshotEntry | null;
  wheelSettingsSnapshotKey: string;
}): void {
  const { activeEntry, activeId, bgColor, wheelSettingsSnapshotKey, wheelWorkspaces } = params;

  if (!activeId) {
    return;
  }

  const wheels = wheelWorkspaces.map((workspace) => {
    if (activeEntry && workspace.id === activeEntry.wheelID) {
      return activeEntry;
    }
    return readSnapshotEntryFromStorage(workspace);
  });

  const snapshot: WheelSettingsSnapshot = {
    wheelID: activeId,
    backgrondcolor: bgColor,
    Wheels: wheels,
  };

  writeJson(wheelSettingsSnapshotKey, snapshot);
}

export function migrateLegacyStorageToUnifiedSnapshot(params: {
  workspaces: WheelWorkspaceMeta[];
  activeWorkspaceId: string;
  snapshotMigrationKey: string;
  wheelSettingsSnapshotKey: string;
  fallbackBgColor: string;
}): void {
  const {
    activeWorkspaceId,
    fallbackBgColor,
    snapshotMigrationKey,
    wheelSettingsSnapshotKey,
    workspaces,
  } = params;

  if (readJson<boolean>(snapshotMigrationKey)) {
    return;
  }

  const existingSnapshot = readJson<WheelSettingsSnapshot>(wheelSettingsSnapshotKey);
  if (existingSnapshot && Array.isArray(existingSnapshot.Wheels) && existingSnapshot.Wheels.length > 0) {
    writeJson(snapshotMigrationKey, true);
    return;
  }

  const activeWorkspaceKey =
    workspaces.some((workspace) => workspace.id === activeWorkspaceId)
      ? activeWorkspaceId
      : (workspaces[0]?.id ?? 'default');

  const sharedBgColor = readJson<string>(STORAGE_KEYS.bgColor);
  const scopedBgColor = readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.bgColor, activeWorkspaceKey));

  const snapshot: WheelSettingsSnapshot = {
    wheelID: activeWorkspaceKey,
    backgrondcolor: sharedBgColor ?? scopedBgColor ?? fallbackBgColor,
    Wheels: workspaces.map((workspace) => readSnapshotEntryFromStorage(workspace)),
  };

  writeJson(wheelSettingsSnapshotKey, snapshot);
  writeJson(snapshotMigrationKey, true);
}

export async function loadWorkspaceDisplayConfig(params: {
  workspaceId: string;
  wheelWorkspaces: WheelWorkspaceMeta[];
  activeWheelId: string;
  activeNames: string[];
  activePalette: ColorPalette;
  activeBgColor: string;
  activeBgImage: string;
  activeCenterImage: string;
  activeCenterColor: string;
  activeCenterText: string;
  activeCenterLogoSize: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl';
  activeFontFamily: string;
}): Promise<WheelDisplayConfig | null> {
  const {
    activeBgColor,
    activeBgImage,
    activeCenterImage,
    activeCenterColor,
    activeCenterText,
    activeCenterLogoSize,
    activeFontFamily,
    activeNames,
    activePalette,
    activeWheelId,
    wheelWorkspaces,
    workspaceId,
  } = params;

  const workspace = wheelWorkspaces.find((item) => item.id === workspaceId);
  if (!workspace) {
    return null;
  }

  const getWorkspaceRootId = (id: string): string => {
    const current = wheelWorkspaces.find((item) => item.id === id);
    if (!current) {
      return id;
    }
    return current.parentWheelId ?? current.id;
  };

  if (workspaceId === activeWheelId) {
    return {
      workspaceId,
      workspaceName: workspace.name,
      names: [...activeNames],
      colors: [...activePalette.colors],
      bgColor: activeBgColor,
      bgImage: activeBgImage,
      centerImage: activeCenterImage,
      centerColor: activeCenterColor,
      centerText: activeCenterText,
      centerLogoSize: activeCenterLogoSize,
      fontFamily: activeFontFamily,
    };
  }

  const palettes = readJson<ColorPalette[]>(storageKeyForWorkspace(STORAGE_KEYS.palettes, workspaceId));
  const selectedPaletteName = readJson<string>(
    storageKeyForWorkspace(STORAGE_KEYS.selectedPaletteName, workspaceId)
  );
  const names = readJson<string[]>(storageKeyForWorkspace(STORAGE_KEYS.names, workspaceId));
  const fontFamily = readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.fontFamily, workspaceId));

  const sharedBgColor = readJson<string>(STORAGE_KEYS.bgColor);
  const bgColor = sharedBgColor && sharedBgColor.length ? sharedBgColor : activeBgColor;

  const bgWorkspaceId = getWorkspaceRootId(workspaceId);
  const scopedBgImage = await readImage(storageKeyForWorkspace(STORAGE_KEYS.bgImage, bgWorkspaceId));
  const legacySharedBgImage = scopedBgImage ? undefined : await readImage(STORAGE_KEYS.bgImage);
  const bgImage = scopedBgImage ?? legacySharedBgImage ?? '';

  const centerImage = (await readImage(storageKeyForWorkspace(STORAGE_KEYS.centerImage, workspaceId))) ?? '';
  const centerColor = readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.centerColor, workspaceId));
  const centerText = readJson<string>(storageKeyForWorkspace(STORAGE_KEYS.centerText, workspaceId));
  const centerLogoSize = readJson<'s' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'>(
    storageKeyForWorkspace(STORAGE_KEYS.centerLogoSize, workspaceId)
  );

  const availablePalettes = Array.isArray(palettes) && palettes.length > 0 ? palettes : DEFAULT_PALETTES;

  const selectedPalette =
    (selectedPaletteName && availablePalettes.find((palette) => palette.name === selectedPaletteName)) ||
    availablePalettes[0] ||
    DEFAULT_PALETTES[0];

  return {
    workspaceId,
    workspaceName: workspace.name,
    names: Array.isArray(names) ? names : [],
    colors: [...selectedPalette.colors],
    bgColor: bgColor && bgColor.length ? bgColor : 'transparent',
    bgImage,
    centerImage,
    centerColor: centerColor && centerColor.length ? centerColor : '#ffffff',
    centerText: centerText && centerText.length ? centerText : 'SPIN',
    centerLogoSize: centerLogoSize ?? 'm',
    fontFamily: fontFamily && fontFamily.length ? fontFamily : '"Inter", sans-serif',
  };
}
