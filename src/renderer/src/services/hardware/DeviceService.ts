// src/renderer/services/hardware/DeviceService.ts

export interface MediaDeviceOption {
  deviceId: string
  label: string
}

class DeviceService {
  public async getAvailableMicrophones(): Promise<MediaDeviceOption[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'audioinput' && !!device.deviceId)
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Mikrofon ${index + 1}`
        }))
    } catch (error) {
      console.error('[DeviceService] Nie udało się pobrać mikrofonów:', error)
      return []
    }
  }

  public async getAvailableCameras(): Promise<MediaDeviceOption[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'videoinput' && !!device.deviceId)
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Kamera ${index + 1}`
        }))
    } catch (error) {
      console.error('[DeviceService] Nie udało się pobrać kamer:', error)
      return []
    }
  }

  public async requestAudioPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Natychmiast zamykamy strumień - chodziło tylko o wymuszenie uprawnień
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      console.warn('[DeviceService] Odmowa dostępu do mikrofonu:', error)
      return false
    }
  }

  public onDeviceChange(callback: () => void): () => void {
    const handler = (): void => callback()

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handler)
    }

    return (): void => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handler)
      }
    }
  }
}

export const deviceService = new DeviceService()
