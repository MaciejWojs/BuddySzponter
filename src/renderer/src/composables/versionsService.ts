import { AppVersion } from '@renderer/schemas/settingsSchemas'
import { Ref } from 'vue'

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

  getVersion(): string {
    return window.api.core.getAppVersion()
  }

  public async init(): Promise<void> {
    await this.fetchSupportedVersions()
  }

  public async checkVersionStatus(): Promise<VersionStatus> {
    // Dodajemy 'await', by wyciągnąć stringa z Promise'a
    const rawVersion = await this.getVersion()

    // Na wszelki wypadek wymuszamy typ String, żeby uniknąć błędu z undefined
    const currentVersion = String(rawVersion).replace(/^v/i, '').trim()

    const versions = this.supportedVersions.value

    // Dla pewności wrzućmy do konsoli, co tam faktycznie siedzi
    console.log('[VersionCheck] Local:', currentVersion, 'API:', versions)

    if (!versions || versions.length === 0) {
      return 'UNKNOWN'
    }

    // 2. Sortujemy wersje z API od NAJNOWSZEJ do NAJSTARSZEJ
    const sortedVersions = [...versions].sort((a, b) => this.compareVersions(b.version, a.version))
    const latestApiVersion = sortedVersions[0]

    // 3. Szukamy naszej wersji na liście
    const currentVersionData = versions.find(
      (v) => v.version.replace(/^v/i, '').trim() === currentVersion
    )

    // 4. Jeśli naszej wersji W OGÓLE NIE MA na liście...
    if (!currentVersionData) {
      // Sprawdzamy, czy to przypadkiem nie jest nowszy build deweloperski
      if (this.compareVersions(currentVersion, latestApiVersion.version) > 0) {
        return 'UP_TO_DATE'
      }
      // Jeśli jest starsza niż cokolwiek na liście, wymaga aktualizacji
      return 'UPDATE_REQUIRED'
    }

    // 5. Jeśli nasza wersja jest na liście, ale ma zablokowane wsparcie (isSupported: false)
    if (!currentVersionData.isSupported) {
      return 'UPDATE_REQUIRED'
    }

    // 6. Porównujemy naszą wersję z najnowszą dostępną z serwera
    if (this.compareVersions(latestApiVersion.version, currentVersion) > 0) {
      return 'UPDATE_AVAILABLE'
    }

    // 7. W każdym innym wypadku – jesteśmy na bieżąco
    return 'UP_TO_DATE'
  }

  private compareVersions(v1: string, v2: string): number {
    // Zabezpieczamy parsowanie przed śmieciowymi znakami
    const cleanV1 = v1.replace(/^v/i, '').trim()
    const cleanV2 = v2.replace(/^v/i, '').trim()

    // Używamy parseInt zamiast samego Number, co jest bezpieczniejsze
    const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10))
    const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10))

    const len = Math.max(parts1.length, parts2.length)

    for (let i = 0; i < len; i++) {
      // Jeśli część wersji nie istnieje (np. brakuje patcha), traktujemy ją jako 0
      const p1 = isNaN(parts1[i]) ? 0 : parts1[i]
      const p2 = isNaN(parts2[i]) ? 0 : parts2[i]

      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }

    return 0
  }
}
