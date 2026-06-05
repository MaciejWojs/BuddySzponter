import type { AppThemeMode } from '@shared/schemas/appPreferences'

export function applyDocumentTheme(theme: AppThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme)
}
