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

  const scheduleAutoRefresh = (originalData: CreateConnectionRequestSchema): void => {
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
      await createHostConnection(originalData)
    }, timeUntilRefresh)
  }

  // --- Główne Akcje ---

  const createHostConnection = async (
    data: CreateConnectionRequestSchema
  ): Promise<CreateConnectionResponse | undefined> => {
    if (getSocketStore().isConnected) {
      await clearConnection()
    }

    const response = await connectionService.createConnection(data)

    if (response?.success && response.data) {
      isHost.value = true
      connectionCode.value = response.data.code
      scheduleAutoRefresh(data)
    } else {
      connectionCode.value = ''
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
    await getSocketStore().disconnect()
  }

  const handleAccessRejected = async (): Promise<void> => {
    if (!isHost.value) {
      await clearConnection()
    }
  }

  const resetState = (): void => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
  }

  return {
    isHost,
    connectionCode,
    resetState,
    createHostConnection,
    joinGuestConnection,
    clearConnection,
    handleAccessRejected
  }
})
