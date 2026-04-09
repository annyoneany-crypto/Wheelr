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
  centerColor: 'giveawayWheel.centerColor',
  centerText: 'giveawayWheel.centerText',
  centerLogoSize: 'giveawayWheel.centerLogoSize',
  spinDurationMs: 'giveawayWheel.spinDurationMs',
  wheelView: 'giveawayWheel.wheelView',
  winnerEffect: 'giveawayWheel.winnerEffect',
  soundEnabled: 'giveawayWheel.soundEnabled',
  customAudio: 'giveawayWheel.customAudio',
  winnerAudio: 'giveawayWheel.winnerAudio',
  countdownAudio: 'giveawayWheel.countdownAudio',
  countdownEnabled: 'giveawayWheel.countdownEnabled',
  countdownStart: 'giveawayWheel.countdownStart',
  visibleWheelCount: 'giveawayWheel.visibleWheelCount',
  showWinnersList: 'giveawayWheel.showWinnersList',
  winnerPanelPosition: 'giveawayWheel.winnerPanelPosition',
  fontFamily: 'giveawayWheel.fontFamily',
  fontLink: 'giveawayWheel.fontLink',
  pointerType: 'giveawayWheel.pointerType',
} as const;

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const DEFAULT_PALETTES: ColorPalette[] = [
  { name: 'Vibrant', colors: ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
  { name: 'RED', colors: ['#DC2626', '#B91C1C', '#7F1D1D', '#000000', '#FFFFFF', '#EF4444'] },
  { name: 'Neon', colors: ['#39FF14', '#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#4D4DFF'] },
  { name: 'Ocean', colors: ['#0891b2', '#0e7490', '#155e75', '#0369a1', '#075985', '#0c4a6e'] },
  { name: 'Sunset', colors: ['#f43f5e', '#fb7185', '#fb923c', '#fbbf24', '#f59e0b', '#d97706'] },
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
  const rgb = parseColorToRgb(hex);
  if (!rgb) return '#000000';

  const { r, g, b } = rgb;

  // Perceived luminance (sRGB-ish). Threshold tuned for UI contrast.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 140 ? '#000000' : '#FFFFFF';
}

function parseColorToRgb(input: string): { r: number; g: number; b: number } | null {
  const value = input.trim();

  const hex3 = /^#?([0-9a-fA-F]{3})$/.exec(value);
  if (hex3) {
    const [r, g, b] = hex3[1].split('').map((ch) => Number.parseInt(ch + ch, 16));
    return { r, g, b };
  }

  const hex6 = /^#?([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/.exec(value);
  if (hex6) {
    const int = Number.parseInt(hex6[1], 16);
    return {
      r: (int >> 16) & 0xff,
      g: (int >> 8) & 0xff,
      b: int & 0xff,
    };
  }

  const rgb = /^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:\d*\.?\d+))?\)$/.exec(value);
  if (rgb) {
    return {
      r: clampColorChannel(Number.parseInt(rgb[1], 10)),
      g: clampColorChannel(Number.parseInt(rgb[2], 10)),
      b: clampColorChannel(Number.parseInt(rgb[3], 10)),
    };
  }

  return null;
}

function clampColorChannel(channel: number): number {
  return Math.max(0, Math.min(255, channel));
}
