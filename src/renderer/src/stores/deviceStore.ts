import { defineStore } from 'pinia'
import { ref } from 'vue'
import { deviceService } from '@renderer/services/hardware/DeviceService'
import { useLogStore } from './devStores/logStore'

export const useDeviceStore = defineStore('device', () => {
  const logStore = useLogStore()
  const availableMicrophones = ref<Array<{ deviceId: string; label: string }>>([])
  const selectedMicrophoneDeviceId = ref<string>('')

  const refreshMicrophones = async (): Promise<void> => {
    try {
      const microphones = await deviceService.getAvailableMicrophones()
      availableMicrophones.value = microphones

      const hasSelected = microphones.some((d) => d.deviceId === selectedMicrophoneDeviceId.value)
      if (!hasSelected) {
        selectedMicrophoneDeviceId.value = microphones[0]?.deviceId ?? ''
      }
    } catch (err) {
      logStore.addLog('ERROR', `Błąd odczytu mikrofonów: ${err}`, 'api')
      availableMicrophones.value = []
      selectedMicrophoneDeviceId.value = ''
    }
  }

  return {
    availableMicrophones,
    selectedMicrophoneDeviceId,
    refreshMicrophones
  }
})
