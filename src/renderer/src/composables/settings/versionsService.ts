import { AppVersion } from '@renderer/schemas/settingsSchemas'
import { ref, Ref } from 'vue'

export type VersionStatus = 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'

export class VersionsService {
  private supportedVersions = ref<AppVersion[]>([])

  constructor(supportedVersions: Ref<AppVersion[]>) {
    this.supportedVersions = supportedVersions
  }

  async fetchSupportedVersions(): Promise<void> {
    try {
      const response = await window.api.core.getSupportedVersions()
      if (response.success) {
        this.supportedVersions.value = response.data
      } else {
        console.error('Failed to fetch supported versions:', response.message)
      }
    } catch (error) {
      console.error('Error fetching supported versions:', error)
    }
  }

  getVersion(): Promise<string> {
    return window.api.core.getAppVersion()
  }

  public async init(): Promise<void> {
    await this.fetchSupportedVersions()
  }

  public async checkVersionStatus(): Promise<VersionStatus> {
    return await window.api.core.getVersionStatus()
  }
}
