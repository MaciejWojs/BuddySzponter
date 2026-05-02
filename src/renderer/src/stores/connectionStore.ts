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
      if (!connected) {
        stopAutoRefresh()
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
      await restoreDefaultHost()
    }, timeUntilRefresh)
  }

  // --- Główne Akcje ---

  let isConnecting = false

  const restoreDefaultHost = async (): Promise<void> => {
    console.log('[ConnectionStore] Odtwarzanie domyślnej sesji Hosta...')
    if (!connectionPassword.value) {
      connectionPassword.value = Math.random().toString(36).slice(-8)
    }
    await createHostConnection()
  }

  const createHostConnection = async (): Promise<CreateConnectionResponse | undefined> => {
    if (isConnecting) {
      console.log('[ConnectionStore] Tworzenie sesji już w toku, pomijam...')
      return undefined
    }

    isConnecting = true
    try {
      if (!connectionPassword.value) {
        connectionPassword.value = Math.random().toString(36).slice(-8)
      }
      const data = {
        password: connectionPassword.value
      } as CreateConnectionRequestSchema

      //TODO: dodać userId ze stora

      if (getSocketStore().isConnected) {
        await clearConnection(false)
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
    } finally {
      isConnecting = false
    }
  }

  const joinGuestConnection = async (
    data: JoinConnectionRequestSchema
  ): Promise<JoinConnectionResponse | undefined> => {
    if (getSocketStore().isConnected) {
      await clearConnection(false)
    }

    stopAutoRefresh()

    const response = await connectionService.joinConnection(data.connectionCode, data.password)

    if (response?.success) {
      isHost.value = false
    }
    return response
  }

  const clearConnection = async (restoreHost = false): Promise<void> => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
    await getSocketStore().disconnect(restoreHost)
  }

  const handleAccessRejected = async (): Promise<void> => {
    console.log(
      '[ConnectionStore] Dostęp odrzucony/Odrzucono kandydata. Odtwarzam domyślnego Hosta...'
    )
    await restoreDefaultHost()
  }

  const resetState = (): void => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
  }

  return {
    isHost,
    connectionCode,
    connectionPassword,
    resetState,
    createHostConnection,
    joinGuestConnection,
    clearConnection,
    handleAccessRejected,
    restoreDefaultHost
  }
})
