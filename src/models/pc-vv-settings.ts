import type { PCVVSettingsLoadingAnimation } from './pc-vv-settings-animation';

export interface PCVVSettings {
  panOffset?: number;
  zoomOffset?: number;
  loadingAnimation?: PCVVSettingsLoadingAnimation;
  noBorder?: boolean;

  onItemClick?: (data: any) => void;
  onSVGLoaded?: () => void;
  onEvent?: (data: any) => void;
}
