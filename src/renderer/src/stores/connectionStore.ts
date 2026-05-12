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

  const activePassword = ref<string>('')

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

    if (isNaN(timeUntilRefresh) || timeUntilRefresh > 115000) {
      console.warn(
        '[ConnectionStore] Zegar rozjechany! Ucinam czas do odświeżenia do bezpiecznych 115s.'
      )
      timeUntilRefresh = 115000
    } else if (timeUntilRefresh <= 0) {
      timeUntilRefresh = 5000
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

  let isConnecting = false

  const initPasswordIfNeeded = async (): Promise<void> => {
    if (!connectionPassword.value) {
      try {
        const savedPassword = await window.api?.settings?.getHostPassword?.()
        if (savedPassword) {
          connectionPassword.value = savedPassword
          activePassword.value = savedPassword
          return
        }
      } catch (error) {
        console.warn(
          '[ConnectionStore] Brak dostępu do API ustawień, generuję losowe hasło.',
          error
        )
      }

      generateRandomPassword()

      activePassword.value = connectionPassword.value
    }
  }

  const hasLowercase = (value: string): boolean => /\p{Ll}/u.test(value)
  const hasUppercase = (value: string): boolean => /\p{Lu}/u.test(value)
  const hasDigit = (value: string): boolean => /\p{N}/u.test(value)
  const hasSpecialCharacter = (value: string): boolean => /[^\p{L}\p{N}]/u.test(value)

  const hasRequiredPasswordCharacters = (value: string): boolean => {
    return (
      hasLowercase(value) && hasUppercase(value) && hasDigit(value) && hasSpecialCharacter(value)
    )
  }

  const generateRandomPassword = (): void => {
    const chars = '1234567890abcdefghijklmnoprstuvxyzABCDEFGHIJKLMNOPRSTUVXYZ#@!$%'
    let generatedPassword = ''
    while (!hasRequiredPasswordCharacters(generatedPassword)) {
      generatedPassword = Array.from(
        { length: 12 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join('')
    }
    connectionPassword.value = generatedPassword
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

        activePassword.value = data.password
        window.api?.settings?.setHostPassword?.(data.password).catch(() => {})

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
    let joinedSuccessfully = false
    try {
      if (getSocketStore().isConnected) {
        await clearConnection(false)
      }

      stopAutoRefresh()

      const response = await connectionService.joinConnection(data.connectionCode, data.password)

      if (response?.success) {
        joinedSuccessfully = true
        isHost.value = false

        connectionCode.value = data.connectionCode
      }

      return response
    } finally {
      if (!joinedSuccessfully) {
        try {
          await restoreDefaultHost()
        } catch (e) {
          console.error('[ConnectionStore] Nie udało się odtworzyć sesji hosta po nieudanym join:', e)
        }
      }
    }
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

  const revertPassword = (): void => {
    if (activePassword.value) {
      connectionPassword.value = activePassword.value
    }
  }

  return {
    isHost,
    connectionCode,
    connectionPassword,
    activePassword,
    resetState,
    createHostConnection,
    joinGuestConnection,
    clearConnection,
    handleAccessRejected,
    restoreDefaultHost,
    generateRandomPassword,
    revertPassword
  }
})
