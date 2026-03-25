import { AppVersion } from '@renderer/schemas/settingsSchemas'
import { app } from 'electron'
import { Ref } from 'vue'

export class VersionsService {
  private supportedVersions = ref<AppVersion[]>([])

  constructor(supportedVersions: Ref<AppVersion[]>) {
    this.supportedVersions = supportedVersions
  }

  currentVersion = ref<string>('0.0.0')

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

  getVersion(): string {
    return app.getVersion()
  }

  public async init(): Promise<void> {
    await this.fetchSupportedVersions()
    this.currentVersion.value = this.getVersion()
  }
}
