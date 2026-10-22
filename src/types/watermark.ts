export type MediaType = 'image' | 'video';

export type MediaStatus = 'ready' | 'rendering' | 'done' | 'error';

export interface MediaItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: MediaType;
  mimeType: string;
  objectUrl: string;
  width: number;
  height: number;
  duration?: number;
  thumbnailUrl?: string;
  status: MediaStatus;
  renderedUrl?: string;
  renderedBlob?: Blob;
  errorMessage?: string;
}

export type GridPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PositionConfig {
  grid: GridPosition;
  offsetX: number; // percentage (-50 to 50)
  offsetY: number; // percentage (-50 to 50)
}

export interface TextWatermarkConfig {
  enabled: boolean;
  text: string;
  fontFamily: string;
  fontSize: number; // relative size percentage (1 to 20)
  color: string;
  opacity: number; // 0 to 1
  rotation: number; // degrees -180 to 180
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
  tile: boolean;
  tileSpacing: number; // pixels
  position: PositionConfig;
}

export interface LogoWatermarkConfig {
  enabled: boolean;
  logoUrl: string | null;
  fileName: string | null;
  scale: number; // scale percent (5 to 60)
  opacity: number; // 0 to 1
  rotation: number; // degrees -180 to 180
  tile: boolean;
  tileSpacing: number;
  position: PositionConfig;
}

export type FrameStyle = 'none' | 'solid' | 'double' | 'dashed' | 'card' | 'banner';

export interface FrameWatermarkConfig {
  enabled: boolean;
  style: FrameStyle;
  borderWidth: number; // relative percent (0.5 to 10)
  borderColor: string;
  padding: number; // relative percent
  metaText: string;
  metaColor: string;
  metaFontSize: number;
}

export interface WatermarkFullConfig {
  text: TextWatermarkConfig;
  logo: LogoWatermarkConfig;
  frame: FrameWatermarkConfig;
}

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  category: 'photography' | 'protection' | 'branding' | 'minimal';
  badge: string;
  config: {
    text?: Partial<TextWatermarkConfig>;
    logo?: Partial<LogoWatermarkConfig>;
    frame?: Partial<FrameWatermarkConfig>;
  };
}

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type VideoExportMode = 'full_video' | 'single_frame';
export type VideoContainerFormat = 'video/webm' | 'video/mp4';
export type ExportOutputFormat = ExportFormat | VideoContainerFormat;

export type VideoQualityPreset = 'maximum' | 'high' | 'standard';
export type VideoQualityProfile = VideoQualityPreset | 'optimal';

export interface VideoBitrateConfig {
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
}

export interface ExportSettings {
  format: ExportFormat;
  videoFormat: VideoContainerFormat;
  videoMode: VideoExportMode;
  quality: number; // 0.1 to 1.0
  videoQuality?: VideoQualityPreset;
  videoQualityProfile?: VideoQualityPreset;
  customPrefix: string;
}

export type FontCategory = 'modern-sans' | 'serif' | 'display' | 'script' | 'monospace';

export interface FontFamilyOption {
  id: string;
  name: string;
  category: FontCategory;
  family: string;
  googleFontName?: string;
  sampleText?: string;
}

export interface FontSizePreset {
  id: string;
  label: string;
  value: number; // Percentage 0.5 to 30.0
}

export type SocialFrameType = 'none' | 'tiktok' | 'reels' | 'shorts';

export interface SocialFrameConfig {
  type: SocialFrameType;
  showDangerZone: boolean;
  showUiMockup: boolean;
  opacity: number;
}

