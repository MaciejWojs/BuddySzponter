import { createHash } from 'crypto'
import os from 'os'
import { localStore, translationStore } from '../store/localStore'
import { ipcMain } from 'electron'
import { AppLanguage, Translation } from '../../shared/schemas/langSchemas'
import fallbackTranslations from '../../shared/locales/en.json'
import type { AppAudioSettings } from '../../shared/schemas/ipc'

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
      localStore.set('language', 'en')
      console.log('[AppSettingsService] No language found in store, defaulting to "en".')
      return 'en'
    }

    return localStore.get('language')
  }

  public getSelectedTranslation(): Translation {
    let translation: Translation
    const selectedLang = this.getSelectedLanguage()

    if (selectedLang === 'en') {
      translation = fallbackTranslations
      translationStore.set('en', fallbackTranslations)
      console.log('[AppSettingsService] No selected language found, using fallback translations.')
    } else {
      translation = translationStore.get(selectedLang)
      if (!translation) {
        console.warn(
          `[AppSettingsService] Translations missing for ${selectedLang}. Falling back to 'en'.`
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

  // --- AUDIO SETTINGS ---

  public getMicrophoneDeviceId(): string {
    return localStore.get('microphoneDeviceId') || ''
  }

  public setMicrophoneDeviceId(deviceId: string): boolean {
    localStore.set('microphoneDeviceId', deviceId || '')
    return true
  }

  public getSpeakerDeviceId(): string {
    return localStore.get('speakerDeviceId') || ''
  }

  public setSpeakerDeviceId(deviceId: string): boolean {
    localStore.set('speakerDeviceId', deviceId || '')
    return true
  }

  public getAudioSettings(): AppAudioSettings {
    return localStore.get('audioSettings')
  }

  public setAudioSettings(settings: Partial<AppAudioSettings>): boolean {
    const current = this.getAudioSettings()
    localStore.set('audioSettings', {
      ...current,
      ...settings
    })
    return true
  }

  // --- HARDWARE ID MANAGEMENT ---

  public getHardwareId(): string {
    let hwId = localStore.get('hardwareId')

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

    ipcMain.handle('settings:getHardwareId', () => {
      return this.getHardwareId()
    })

    ipcMain.handle('settings:setLanguage', (_event, lang: AppLanguage) => {
      return this.setLanguage(lang)
    })

    ipcMain.handle('settings:getMicrophoneDeviceId', () => {
      return this.getMicrophoneDeviceId()
    })

    ipcMain.handle('settings:setMicrophoneDeviceId', (_event, deviceId: string) => {
      return this.setMicrophoneDeviceId(deviceId)
    })

    ipcMain.handle('settings:getSpeakerDeviceId', () => {
      return this.getSpeakerDeviceId()
    })

    ipcMain.handle('settings:setSpeakerDeviceId', (_event, deviceId: string) => {
      return this.setSpeakerDeviceId(deviceId)
    })

    ipcMain.handle('settings:getAudioSettings', () => {
      return this.getAudioSettings()
    })

    ipcMain.handle('settings:setAudioSettings', (_event, settings: Partial<AppAudioSettings>) => {
      return this.setAudioSettings(settings)
    })
  }
}

export const appSettings = AppSettingsService.getInstance()
