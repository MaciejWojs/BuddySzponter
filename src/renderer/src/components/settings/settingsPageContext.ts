import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type {
  AppThemeMode,
  CaptureBackendMode,
  VideoQualityPreset
} from '@shared/schemas/appPreferences'
import type { UserResponseSchema } from '@shared/schemas/user'

export interface QualityPresetItem {
  id: VideoQualityPreset
  labelKey: string
}

export interface SettingsPageContext {
  deviceName: Ref<string>
  isAuthenticated: ComputedRef<boolean>
  currentUser: Ref<UserResponseSchema | null>
  shouldUseCpuHint: Ref<boolean | null>
  captureModeLabel: ComputedRef<string>
  captureBackend: Ref<CaptureBackendMode>
  qualityPresets: QualityPresetItem[]
  activeVideoQuality: Ref<VideoQualityPreset>
  advancedOpen: Ref<boolean>
  advBitrateKbps: Ref<number>
  advFps: Ref<number>
  openAtLogin: Ref<boolean>
  closeToTray: Ref<boolean>
  themeMode: Ref<AppThemeMode>
  downloadPath: Ref<string>
  appVersion: Ref<string>
  versionsLine: ComputedRef<string>
  versionStatus: Ref<string>
  persistCaptureBackend: () => Promise<void>
  onQualityPresetClick: (e: MouseEvent, preset: VideoQualityPreset) => Promise<void>
  applyAdvancedLimits: () => Promise<void>
  onCloseToTrayChange: (value: boolean) => Promise<void>
  onThemeChange: (mode: AppThemeMode) => Promise<void>
  onOpenAtLoginChange: (value: boolean) => Promise<void>
  pickFolder: () => Promise<void>
  savePath: () => void
}

export const SETTINGS_PAGE_CONTEXT: InjectionKey<SettingsPageContext> = Symbol('settingsPage')

export function provideSettingsPage(ctx: SettingsPageContext): void {
  provide(SETTINGS_PAGE_CONTEXT, ctx)
}

export function useSettingsPageContext(): SettingsPageContext {
  const ctx = inject(SETTINGS_PAGE_CONTEXT)
  if (!ctx) {
    throw new Error('useSettingsPageContext() must be used within the settings page')
  }
  return ctx
}
