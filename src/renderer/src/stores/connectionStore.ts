import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CreateConnectionRequestSchema } from '@shared/schemas/connection'
import { connectionService } from '@renderer/composables/connection/connectionService'
import { WsConnectResponse } from '@shared/schemas/ipc'
import { useSocketStore } from './socketStore'

export const useConnectionStore = defineStore('connection', () => {
  const isHost = ref<boolean>(false)
  const connectionCode = ref<string>('')
  const socketStore = useSocketStore()

  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => socketStore.accessStatus,
    async (status) => {
      if (status === 'rejected' && !isHost.value) {
        await clearConnection()
      }
    }
  )

  watch(
    () => socketStore.isConnected,
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
      if (socketStore.accessStatus === 'accepted') {
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
  ): Promise<WsConnectResponse | undefined> => {
    if (socketStore.isConnected) {
      await clearConnection()
    }

    const response = await connectionService.createConnection(data)
    if (response?.success) {
      isHost.value = true
      connectionCode.value = response.data.code
      scheduleAutoRefresh(data)
      await socketStore.connect(response.data.token)
    } else {
      connectionCode.value = ''
    }
    return response
  }

  const joinGuestConnection = async (
    code: string,
    password: string
  ): Promise<WsConnectResponse | undefined> => {
    if (socketStore.isConnected) {
      await clearConnection()
    }

    stopAutoRefresh()

    const response = await connectionService.joinConnection(code, password)

    if (response?.success && response.data) {
      isHost.value = false

      const result = await socketStore.connect(response.data.token)
      console.log('[ConnectionStore] Połączenie WebSocket po dołączeniu:', result)

      if (result.success) {
        await socketStore.wsService.requestAccess(response.data.connectionUUID)
      }
    }
    return response
  }

  const clearConnection = async (): Promise<void> => {
    stopAutoRefresh()
    isHost.value = false
    connectionCode.value = ''
    await socketStore.disconnect()
  }

  return {
    isHost,
    connectionCode,
    createHostConnection,
    joinGuestConnection,
    clearConnection
  }
})
