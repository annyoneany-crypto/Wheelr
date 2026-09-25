import { ColorPalette } from './global_function';
import type { effectType, pointerType, wheelViewType } from '../modules/classes/custom-type';

export type WinnerPanelPosition = 'left' | 'top' | 'right' | 'bottom';

/** One completed spin, as `performSpin` ran it (CSS rotations in degrees). */
export interface LastSpin {
  workspaceId: string;
  winner: string;
  startRotation: number;
  endRotation: number;
  durationMs: number;
}

export interface WheelWorkspaceMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  parentWheelId?: string;
  cloudConfigId?: string;
  cloudSyncedAt?: string;
}

export interface WheelDisplayConfig {
  workspaceId: string;
  workspaceName: string;
  names: string[];
  colors: string[];
  /**
   * Gradient palettes only (see ColorPalette.gradientTo). Left out entirely otherwise:
   * Firestore rejects `undefined` fields, and older documents simply have none.
   */
  gradientTo?: string[];
  bgColor: string;
  bgImage: string;
  centerImage: string;
  centerColor: string;
  centerText: string;
  centerLogoSize: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl';
  fontFamily: string;
  wheelImage: string;
  sliceImages: string[];
  showWinnerEffect: boolean;
}

export interface WheelTemplateDefinition {
  name: string;
  description: string;
  names: string[];
  palette: ColorPalette;
  centerText: string;
  centerColor: string;
  winnerEffect: effectType;
  pointerType: pointerType;
  spinDurationMs: number;
}

export interface WheelSnapshotEntry {
  wheelID: string;
  name: string;
  description: string;
  palettes: ColorPalette[];
  selectedPaletteName: string;
  names: string[];
  centerLogoSize: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl';
  wheelView: wheelViewType;
  winnerEffect: effectType;
  showWinnerEffect: boolean;
  spinDurationMs: number;
  soundEnabled: boolean;
  countdownEnabled: boolean;
  countdownStart: number;
  fontFamily: string;
  fontLink: string;
  visibleWheelCount: number;
  showWinnersList: boolean;
  winnerPanelPosition: WinnerPanelPosition;
  pointerType: pointerType;
}

export interface WheelSettingsSnapshot {
  wheelID: string;
  backgrondcolor: string;
  Wheels: WheelSnapshotEntry[];
}

export interface ActiveWheelSnapshotState {
  workspace: WheelWorkspaceMeta;
  palettes: ColorPalette[];
  selectedPaletteName: string;
  names: string[];
  centerLogoSize: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl';
  wheelView: wheelViewType;
  winnerEffect: effectType;
  showWinnerEffect: boolean;
  spinDurationMs: number;
  soundEnabled: boolean;
  countdownEnabled: boolean;
  countdownStart: number;
  fontFamily: string;
  fontLink: string;
  visibleWheelCount: number;
  showWinnersList: boolean;
  winnerPanelPosition: WinnerPanelPosition;
  pointerType: pointerType;
}
