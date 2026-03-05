import { ColorPalette } from './global_function';

export interface WheelWorkspaceMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  parentWheelId?: string;
}

export interface WheelDisplayConfig {
  workspaceId: string;
  workspaceName: string;
  names: string[];
  colors: string[];
  bgColor: string;
  bgImage: string;
  centerImage: string;
  fontFamily: string;
}

export interface WheelSnapshotEntry {
  wheelID: string;
  name: string;
  description: string;
  palettes: ColorPalette[];
  selectedPaletteName: string;
  names: string[];
  centerLogoSize: 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl';
  wheelView: 'wheel' | 'linear' | 'cards';
  spinDurationMs: number;
  soundEnabled: boolean;
  countdownEnabled: boolean;
  countdownStart: number;
  fontFamily: string;
  fontLink: string;
  visibleWheelCount: number;
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
  wheelView: 'wheel' | 'linear' | 'cards';
  spinDurationMs: number;
  soundEnabled: boolean;
  countdownEnabled: boolean;
  countdownStart: number;
  fontFamily: string;
  fontLink: string;
  visibleWheelCount: number;
}
