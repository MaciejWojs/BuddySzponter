import { createHash } from 'crypto'
import os from 'os'
import { localStore } from '../store/localStore'
import { AppLanguage, AppLanguageSchema, Translation } from '../../shared/schemas/langSchemas'
import { loadTranslations } from '../handlers/i18n/loadTranslations'
import { ipcMain } from 'electron'

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

  public getLanguage(): AppLanguage {
    const lang = localStore.get('language')
    console.log('[AppSettingsService] Retrieved language from store:', lang)
    const parsed = AppLanguageSchema.safeParse(lang)
    return parsed.success ? parsed.data : 'pl'
  }

  public async setLanguage(
    lang: unknown
  ): Promise<{ success: boolean; data?: Translation; error?: string }> {
    const parsed = AppLanguageSchema.safeParse(lang)

    if (!parsed.success) {
      console.error('[AppSettingsService] Invalid language code:', lang)
      return { success: false, error: 'Invalid language code' }
    }

    const validLang = parsed.data

    try {
      const result = await loadTranslations(validLang)

      if (result.success) {
        localStore.set('language', validLang)
      }

      return result
    } catch (error) {
      console.error('[AppSettingsService] Fatal error setting language:', error)
      return { success: false, error: 'Internal system error' }
    }
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
      return this.getLanguage()
    })

    ipcMain.handle('i18n:loadTranslations', async (_event, lang: unknown) => {
      return await this.setLanguage(lang)
    })

    ipcMain.handle('settings:getHardwareId', () => this.getHardwareId())
  }
}

export const appSettings = AppSettingsService.getInstance()
