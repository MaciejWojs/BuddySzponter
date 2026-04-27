// renderer/src/stores/connectionStore.ts

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  createConnectionSchema,
  type JoinConnectionRequestSchema
} from '@shared/schemas/connection'
import { connectionService } from '@renderer/composables/connection/connectionService'
import { useSocketStore } from './socketStore'
import { CreateConnectionResponse, JoinConnectionResponse } from '@shared/schemas/ipc'

export const useConnectionStore = defineStore('connection', () => {
  const isHost = ref<boolean>(false)
  const connectionCode = ref<string>('')
  const connectionPassword = ref<string>('')

  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let passwordDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let isRecreatingCode = false
  let isInitializing = true

  const getSocketStore = (): ReturnType<typeof useSocketStore> => useSocketStore()

  // Zmodyfikowany watcher: reaguje tylko jeśli sesja faktycznie padła i NIE jest w trybie WebRTC (Acknowledged)
  watch(
    () => getSocketStore().isConnected,
    async (connected) => {
      if (!connected && !getSocketStore().isAcknowledged) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        if (getSocketStore().isConnected || getSocketStore().isReconnecting || isRecreatingCode)
          return

        if (isHost.value) {
          console.log('[ConnectionStore] Sesja nieaktywna, odnawiam kod hosta...')
          await recreateHostConnection()
        } else if (connectionCode.value) {
          clearConnectionLocally()
        }
      }
    }
  )

  const stopAutoRefresh = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  const scheduleAutoRefresh = (): void => {
    stopAutoRefresh()
    const expiresAt = connectionService.connectionExpiresDate?.getTime()
    if (!expiresAt) return

    refreshTimer = setTimeout(
      async () => {
        if (getSocketStore().isAcknowledged) return
        await recreateHostConnection()
      },
      Math.max(expiresAt - Date.now() - 5000, 0)
    )
  }

  const clearConnectionLocally = (): void => {
    stopAutoRefresh()
    connectionCode.value = ''
  }

  watch(connectionPassword, async (newVal) => {
    if (newVal === undefined) return
    const validationResult = createConnectionSchema.shape.password.safeParse(newVal)
    if (passwordDebounceTimer) clearTimeout(passwordDebounceTimer)

    if (validationResult.success) {
      await window.api.settings.setConnectionPassword(newVal)
      const execute = async (): Promise<void> => {
        if (!getSocketStore().isAcknowledged && !isRecreatingCode) {
          await createHostConnection()
        }
      }
      if (isInitializing) {
        isInitializing = false
        await execute()
      } else {
        passwordDebounceTimer = setTimeout(execute, 800)
      }
    } else if (connectionCode.value && !getSocketStore().isAcknowledged) {
      clearConnectionLocally()
      await getSocketStore().disconnect()
    }
  })

  const createHostConnection = async (): Promise<CreateConnectionResponse | undefined> => {
    if (passwordDebounceTimer) clearTimeout(passwordDebounceTimer)
    if (isRecreatingCode) return undefined
    isRecreatingCode = true

    try {
      if (getSocketStore().isConnected) {
        await getSocketStore().disconnect()
        await new Promise((r) => setTimeout(r, 150))
      }

      const response = await connectionService.createConnection({
        password: connectionPassword.value
      })

      if (response?.success && response.data) {
        isHost.value = true
        connectionCode.value = response.data.code
        if (response.data.token) {
          await getSocketStore().connect(response.data.token)
        }
        scheduleAutoRefresh()
      } else {
        clearConnectionLocally()
      }
      return response
    } finally {
      isRecreatingCode = false
    }
  }

  const recreateHostConnection = async (): Promise<void> => {
    await createHostConnection()
  }

  const initHost = async (): Promise<void> => {
    isInitializing = true
    const savedPassword = await window.api.settings.getConnectionPassword()
    if (savedPassword) {
      connectionPassword.value = savedPassword
    } else {
      isInitializing = false
    }
  }

  const joinGuestConnection = async (
    data: JoinConnectionRequestSchema
  ): Promise<JoinConnectionResponse | undefined> => {
    isHost.value = false
    if (getSocketStore().isConnected) {
      await getSocketStore().disconnect()
      await new Promise((r) => setTimeout(r, 150))
    }
    stopAutoRefresh()

    const response = await connectionService.joinConnection(data.connectionCode, data.password)

    if (response?.success && response.data?.token) {
      connectionCode.value = data.connectionCode

      const wsResponse = await getSocketStore().connect(response.data.token)
      if (wsResponse.success) {
        const sessionId = response.data.connectionUUID
        try {
          await getSocketStore().wsService.requestAccess(sessionId)
        } catch (e) {
          console.error('[ConnectionStore] Błąd podczas żądania dostępu:', e)
        }
      } else {
        connectionCode.value = ''
      }
    } else {
      connectionCode.value = ''
    }

    return response
  }

  const clearConnection = async (): Promise<void> => {
    isHost.value = false
    clearConnectionLocally()
    await getSocketStore().disconnect()
  }

  const handleAccessRejected = async (): Promise<void> => {
    if (!isHost.value) await getSocketStore().disconnect()
    await recreateHostConnection()
  }

  const resetState = async (): Promise<void> => {
    const wasHost = isHost.value
    isHost.value = false
    clearConnectionLocally()
    if (wasHost) await recreateHostConnection()
  }

  return {
    isHost,
    connectionCode,
    connectionPassword,
    initHost,
    resetState,
    createHostConnection,
    recreateHostConnection,
    joinGuestConnection,
    clearConnection,
    handleAccessRejected
  }
})
