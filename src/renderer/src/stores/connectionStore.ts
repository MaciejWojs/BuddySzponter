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
    if (!expiresAt || isNaN(expiresAt)) return

    const now = new Date().getTime()
    let timeUntilRefresh = expiresAt - now - 5000

    // Zabezpieczenie przed pętlą (0ms timeout), gdy data wygaśnięcia jest przestarzała, w przeszłości lub z innej strefy czasowej
    if (isNaN(timeUntilRefresh) || timeUntilRefresh <= 0) {
      console.warn(
        '[ConnectionStore] Czas wygaśnięcia wyliczony na <= 0 lub NaN. Wymuszam 30s opóźnienia, by zapobiec pętli.'
      )
      timeUntilRefresh = 30000
    }

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

  // Automatyczna synchronizacja hasła z secureStore po każdej jego zmianie
  watch(connectionPassword, async (newVal) => {
    if (newVal) {
      await window.api?.settings?.setHostPassword?.(newVal).catch(() => {})
    }
  })

  const initPasswordIfNeeded = async (): Promise<void> => {
    if (!connectionPassword.value) {
      try {
        const savedPassword = await window.api?.settings?.getHostPassword?.()
        if (savedPassword) {
          connectionPassword.value = savedPassword
          return
        }
      } catch (error) {
        console.warn(
          '[ConnectionStore] Brak dostępu do API ustawień, generuję losowe hasło.',
          error
        )
      }
      // Generujemy hasło spełniające potencjalne wymogi (wielka i mała litera, cyfra, znak spec.)
      connectionPassword.value = 'H0st@' + Math.random().toString(36).slice(-4) + 'aA'
    }
  }

  const restoreDefaultHost = async (): Promise<void> => {
    console.log('[ConnectionStore] Odtwarzanie domyślnej sesji Hosta...')
    await createHostConnection()
  }

  const createHostConnection = async (): Promise<CreateConnectionResponse | undefined> => {
    if (isConnecting) {
      console.log('[ConnectionStore] Tworzenie sesji już w toku, pomijam...')
      return undefined
    }

    isConnecting = true
    await initPasswordIfNeeded()
    try {
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
