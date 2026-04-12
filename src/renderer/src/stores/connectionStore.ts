// renderer/src/stores/connectionStore.ts

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '@shared/schemas/connection'
import { connectionService } from '@renderer/composables/connection/connectionService'
import { useSocketStore } from './socketStore'
import { CreateConnectionResponse, JoinConnectionResponse } from '@shared/schemas/ipc'

export const useConnectionStore = defineStore('connection', () => {
  const isHost = ref<boolean>(false)
  const connectionCode = ref<string>('')
  const connectionPassword = ref<string>('')

  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  const getSocketStore = (): ReturnType<typeof useSocketStore> => useSocketStore()

  // --- WATCHERS ---

  watch(
    () => getSocketStore().isConnected,
    (connected) => {
      if (!connected && connectionCode.value) {
        stopAutoRefresh()
        clearConnection()
      }
    }
  )

  const stopAutoRefresh = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
      console.log('[ConnectionStore] Auto-refresh zatrzymany.')
    }
  }

  const scheduleAutoRefresh = (): void => {
    stopAutoRefresh()

    const expiresAt = connectionService.connectionExpiresDate?.getTime()
    if (!expiresAt) return

    const now = new Date().getTime()
    const timeUntilRefresh = Math.max(expiresAt - now - 5000, 0)

    refreshTimer = setTimeout(async () => {
      if (getSocketStore().isAcknowledged) {
        console.log('[ConnectionStore] Sesja w toku. Ignoruję odświeżanie PINu.')
        return
      }

      console.log('[ConnectionStore] Token wygasa! Odświeżam połączenie...')
      await createHostConnection()
    }, timeUntilRefresh)
  }

  // --- Główne Akcje ---

  const createHostConnection = async (): Promise<CreateConnectionResponse | undefined> => {
    const data = {
      password: connectionPassword.value
    } as CreateConnectionRequestSchema

    //TODO: dodać userId ze stora

    if (getSocketStore().isConnected) {
      await clearConnection()
    }

    const response = await connectionService.createConnection(data)

    if (response?.success && response.data) {
      isHost.value = true
      connectionCode.value = response.data.code
      connectionPassword.value = data.password
      scheduleAutoRefresh()
    } else {
      connectionCode.value = ''
      connectionPassword.value = ''
    }
    return response
  }

  const joinGuestConnection = async (
    data: JoinConnectionRequestSchema
  ): Promise<JoinConnectionResponse | undefined> => {
    if (getSocketStore().isConnected) {
      await clearConnection()
    }

    stopAutoRefresh()

    const response = await connectionService.joinConnection(data.connectionCode, data.password)

    if (response?.success) {
      isHost.value = false
    }
    return response
  }

  const clearConnection = async (): Promise<void> => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
    connectionPassword.value = ''
    await getSocketStore().disconnect()
  }

  const handleAccessRejected = async (): Promise<void> => {
    if (!isHost.value) {
      await clearConnection()
      return
    }

    if (connectionPassword.value) {
      await createHostConnection()
    } else {
      console.warn('[ConnectionStore] Brak hasła hosta. Nie mogę wygenerować nowego kodu.')
    }
  }

  const resetState = (): void => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
    connectionPassword.value = ''
  }

  return {
    isHost,
    connectionCode,
    connectionPassword,
    resetState,
    createHostConnection,
    joinGuestConnection,
    clearConnection,
    handleAccessRejected
  }
})
