/**
 * Global utility functions for storage, color conversion, and helpers
 */

export const STORAGE_KEYS = {
  palettes: 'giveawayWheel.palettes',
  selectedPaletteName: 'giveawayWheel.selectedPaletteName',
  names: 'giveawayWheel.names',
  bgColor: 'giveawayWheel.bgColor',
  bgImage: 'giveawayWheel.bgImage',
  centerImage: 'giveawayWheel.centerImage',
  centerLogoSize: 'giveawayWheel.centerLogoSize',
  spinDurationMs: 'giveawayWheel.spinDurationMs',
  wheelView: 'giveawayWheel.wheelView',
  soundEnabled: 'giveawayWheel.soundEnabled',
  customAudio: 'giveawayWheel.customAudio',
  winnerAudio: 'giveawayWheel.winnerAudio',
  countdownAudio: 'giveawayWheel.countdownAudio',
  countdownEnabled: 'giveawayWheel.countdownEnabled',
  countdownStart: 'giveawayWheel.countdownStart',
  fontFamily: 'giveawayWheel.fontFamily',
  fontLink: 'giveawayWheel.fontLink',
} as const;

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const DEFAULT_PALETTES: ColorPalette[] = [
  { name: 'RED', colors: ['#DC2626', '#B91C1C', '#7F1D1D', '#000000', '#FFFFFF', '#EF4444'] },
  { name: 'Vibrante', colors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
  { name: 'Neon', colors: ['#39FF14', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#4D4DFF'] },
  { name: 'Oceano', colors: ['#0891b2', '#0e7490', '#155e75', '#0369a1', '#075985', '#0c4a6e'] },
  { name: 'Tramonto', colors: ['#f43f5e', '#fb7185', '#fb923c', '#fbbf24', '#f59e0b', '#d97706'] },
];

/**
 * Read JSON value from localStorage
 */
export function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Write JSON value to localStorage
 */
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to write to localStorage', { key, value, error: e });
    // ignore (storage quota, private mode, etc.)
  }
}

/**
 * Open IndexedDB connection
 */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('giveawayWheel', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) {
        debugger;
        db.createObjectStore('images');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Write image/audio data to IndexedDB
 */
export async function writeImage(key: string, data: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const req = store.put(data, key);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  } catch {
    // ignore failures
  }
}

/**
 * Read image/audio data from IndexedDB
 */
export async function readImage(key: string): Promise<string | undefined> {
  try {
    const db = await openDb();
    return await new Promise<string | undefined>((res, rej) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.get(key);
      req.onsuccess = () => res(req.result as string | undefined);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return undefined;
  }
}

/**
 * Normalize degree value to 0-359 range
 */
export function clampDeg(deg: number): number {
  const m = deg % 360;
  return (m + 360) % 360;
}

/**
 * Calculate contrast color (#000000 or #FFFFFF) for given hex color
 */
export function contrastForHex(hex: string): '#000000' | '#FFFFFF' {
  // Expect #RRGGBB
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '#FFFFFF';

  const int = Number.parseInt(m[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;

  // Perceived luminance (sRGB-ish). Threshold tuned for UI contrast.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 140 ? '#000000' : '#FFFFFF';
}
