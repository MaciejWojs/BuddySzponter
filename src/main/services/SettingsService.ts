import { createHash } from 'crypto'
import os from 'os'
import { localStore, translationStore } from '../store/localStore'
import { ipcMain } from 'electron'
import { AppLanguage, Translation } from '../../shared/schemas/langSchemas'
import fallbackTranslations from '../../shared/locales/er.json'

export class AppSettingsService {
  private static instance: AppSettingsService

  private constructor() {
    console.log('[AppSettingsService] Initializing service...')
  }

  public static getInstance(): AppSettingsService {
    if (!AppSettingsService.instance) {
      AppSettingsService.instance = new AppSettingsService()
    }
    return AppSettingsService.instance
  }

  // --- LANGUAGE MANAGEMENT ---

  public getSelectedLanguage(): AppLanguage {
    const savedLang = localStore.get('language')
    if (!savedLang) {
      localStore.set('language', 'er')
      console.log('[AppSettingsService] No language found in store, defaulting to "er".')
      return 'er'
    }

    return localStore.get('language')
  }

  public getSelectedTranslation(): Translation {
    let translation: Translation
    const selectedLang = this.getSelectedLanguage()

    if (selectedLang === 'er') {
      translation = fallbackTranslations
      translationStore.set('er', fallbackTranslations)
      console.log('[AppSettingsService] No selected language found, using fallback translations.')
    } else {
      translation = translationStore.get(selectedLang)
      if (!translation) {
        console.warn(
          `[AppSettingsService] Translations missing for ${selectedLang}. Falling back to 'er'.`
        )
        translation = fallbackTranslations
      }
    }

    return translation
  }

  public setLanguage(lang: AppLanguage): boolean {
    const availableLanguages = localStore.get('availableLanguages') || []
    if (availableLanguages.length > 0 && !availableLanguages.includes(lang)) {
      console.warn(`[AppSettingsService] Attempted to set unavailable language: ${lang}`)
    }

    localStore.set('language', lang)
    console.log(`[AppSettingsService] Language successfully changed to: '${lang}'`)

    return true
  }

  // --- HARDWARE ID MANAGEMENT ---

  public getHardwareId(): string {
    let hwId = ''
    localStore.get('hardwareId')

    if (!hwId) {
      hwId = this.generateHardwareId()
      localStore.set('hardwareId', hwId)
    }

    return hwId
  }

  public getDeviceName(): string {
    return os.hostname()
  }

  public getOsName(): string {
    const platform = os.platform()
    switch (platform) {
      case 'win32':
        return 'Windows'
      case 'darwin':
        return 'macOS'
      case 'linux':
        return 'Linux'
      default:
        return platform
    }
  }

  private generateHardwareId(): string {
    const userInfo = os.userInfo().username
    const hostname = os.hostname()
    const platform = os.platform() // win32, linux, darwin
    const arch = os.arch() // x64, arm64
    const cpuModel = os.cpus()[0]?.model || 'unknown-cpu'
    const totalMem = os.totalmem()

    const networkInterfaces = os.networkInterfaces()
    const mac =
      Object.values(networkInterfaces)
        .flat()
        .find((iface) => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac ||
      'no-mac'

    const rawId = `${hostname}|${userInfo}|${platform}|${arch}|${cpuModel}|${totalMem}|${mac}`

    const hash = createHash('sha256').update(rawId).digest('hex').slice(0, 64)

    return `SZPN-${hash}`
  }

  public registerHandlers(): void {
    ipcMain.handle('settings:getLanguage', () => {
      return this.getSelectedLanguage()
    })

    ipcMain.handle('settings:getTranslation', () => {
      return this.getSelectedTranslation()
    })

    ipcMain.handle('settings:setLanguage', (_event, lang: AppLanguage) => {
      return this.setLanguage(lang)
    })
  }
}

export const appSettings = AppSettingsService.getInstance()
