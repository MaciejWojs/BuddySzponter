import { ipcMain } from 'electron'
import { getAvailableLanguages } from '../handlers/core/languages'
import { getSupportedVersions } from '../handlers/core/supported-versions'
import { SupportedVersion } from '../../shared/schemas/ipc'

export class CoreService {
  private constructor() {
    console.log('[CoreService] Initializing service...')
  }

  private static instance: CoreService

  public static getInstance(): CoreService {
    if (!CoreService.instance) {
      CoreService.instance = new CoreService()
    }
    return CoreService.instance
  }

  private availableLanguages: string[] = []
  private supportedVersions: SupportedVersion[] = []

  private async updateAvailableLanguages(): Promise<void> {
    const response = await getAvailableLanguages()
    this.availableLanguages = response.success && response.data ? response.data : ['en']
    console.log('[CoreService] Available languages updated:', this.availableLanguages)
  }

  private async updateSupportedVersions(): Promise<void> {
    const response = await getSupportedVersions()
    this.supportedVersions = response.success && response.data ? response.data : []
    console.log('[CoreService] Supported versions updated:', this.supportedVersions)
  }

  public async getSupportedVersions(): Promise<SupportedVersion[]> {
    if (this.supportedVersions.length === 0) {
      await this.updateSupportedVersions()
    }
    return this.supportedVersions
  }

  public async getAvailableLanguages(): Promise<string[]> {
    if (this.availableLanguages.length === 0) {
      await this.updateAvailableLanguages()
    }
    return this.availableLanguages
  }

  public registerHandlers(): void {
    console.log('[CoreService] Registering handlers...')
    ipcMain.handle('core:getLocale', async (_event, params) => {
      const { getLocale } = await import('../handlers/core/locale')
      return await getLocale(params)
    })
    ipcMain.handle('core:getAvailableLanguages', async () => {
      const { getAvailableLanguages } = await import('../handlers/core/languages')
      return await getAvailableLanguages()
    })
    ipcMain.handle('core:getSupportedVersions', async () => {
      const { getSupportedVersions } = await import('../handlers/core/supported-versions')
      return await getSupportedVersions()
    })
    ipcMain.handle('core:getAppVersion', async () => {
      const { getVersion } = await import('../handlers/core/version')
      return getVersion()
    })
  }
}
export const coreService = CoreService.getInstance()
