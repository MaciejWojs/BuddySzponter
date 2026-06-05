import { ipcMain } from 'electron'
import { getAvailableLanguages } from '../handlers/core/languages'
import { getSupportedVersions } from '../handlers/core/supported-versions'
import { SupportedVersion } from '../../shared/schemas/ipc'

export type VersionStatus = 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'

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
  private versionStatus: VersionStatus = 'UNKNOWN'

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

  private normalizeVersion(version: string): string {
    return String(version).replace(/^v/i, '').trim()
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = this.normalizeVersion(v1)
      .split('.')
      .map((part) => parseInt(part, 10))
    const parts2 = this.normalizeVersion(v2)
      .split('.')
      .map((part) => parseInt(part, 10))

    const len = Math.max(parts1.length, parts2.length)

    for (let i = 0; i < len; i++) {
      const p1 = Number.isNaN(parts1[i]) ? 0 : parts1[i]
      const p2 = Number.isNaN(parts2[i]) ? 0 : parts2[i]

      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }

    return 0
  }

  private resolveVersionStatus(
    currentVersion: string,
    versions: SupportedVersion[]
  ): VersionStatus {
    if (!versions || versions.length === 0) {
      return 'UNKNOWN'
    }

    const sortedVersions = [...versions].sort((a, b) => this.compareVersions(b.version, a.version))
    const latestVersion = sortedVersions[0]

    const currentVersionData = versions.find(
      (version) => this.normalizeVersion(version.version) === this.normalizeVersion(currentVersion)
    )

    if (!currentVersionData) {
      if (this.compareVersions(currentVersion, latestVersion.version) > 0) {
        return 'UP_TO_DATE'
      }
      return 'UPDATE_REQUIRED'
    }

    if (!currentVersionData.isSupported) {
      return 'UPDATE_REQUIRED'
    }

    if (this.compareVersions(latestVersion.version, currentVersion) > 0) {
      return 'UPDATE_AVAILABLE'
    }

    return 'UP_TO_DATE'
  }

  public async getVersionStatus(forceRefresh = false): Promise<VersionStatus> {
    if (forceRefresh || this.supportedVersions.length === 0) {
      await this.updateSupportedVersions()
    }

    const { getVersion } = await import('../handlers/core/version')
    const currentVersion = getVersion()

    this.versionStatus = this.resolveVersionStatus(currentVersion, this.supportedVersions)
    return this.versionStatus
  }

  public async isUpdateRequired(forceRefresh = false): Promise<boolean> {
    const status = await this.getVersionStatus(forceRefresh)
    return status === 'UPDATE_REQUIRED'
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
    ipcMain.handle('core:getVersionStatus', async () => {
      return await this.getVersionStatus(true)
    })
    ipcMain.handle('core:isUpdateRequired', async () => {
      return await this.isUpdateRequired(true)
    })
  }
}
export const coreService = CoreService.getInstance()
