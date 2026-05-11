export type VideoQualityPreset = 'low' | 'medium' | 'high' | 'ultra'

export type AppThemeMode = 'dark' | 'light'

/** Windows screen-capture backend preference (`auto` = library default). */
export type CaptureBackendMode = 'auto' | 'gdi' | 'dxgi' | 'winrt'

export interface AppStoredPreferences {
  videoQualityPreset: VideoQualityPreset
  closeToTray: boolean
  theme: AppThemeMode
  captureBackend: CaptureBackendMode
}

export const VIDEO_QUALITY_PRESETS: VideoQualityPreset[] = ['low', 'medium', 'high', 'ultra']

export function isVideoQualityPreset(value: unknown): value is VideoQualityPreset {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'ultra'
}

export function isAppThemeMode(value: unknown): value is AppThemeMode {
  return value === 'dark' || value === 'light'
}

export const CAPTURE_BACKEND_MODES: CaptureBackendMode[] = ['auto', 'gdi', 'dxgi', 'winrt']

export function isCaptureBackendMode(value: unknown): value is CaptureBackendMode {
  return value === 'auto' || value === 'gdi' || value === 'dxgi' || value === 'winrt'
}
