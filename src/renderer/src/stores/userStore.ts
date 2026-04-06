import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ValidationErrorCause } from '@shared/schemas/ipc'
import type { UserResponseSchema } from '@shared/schemas/user'

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  email: string
  nickname: string
  password: string
  confirmPassword: string
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserResponseSchema | null>(null)
  const initialized = ref(false)

  const isInitializing = ref(false)
  const isRegistering = ref(false)
  const isLoggingIn = ref(false)
  const isLoggingOut = ref(false)
  const isFetchingUser = ref(false)

  const errorMessage = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})
  let initSessionPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => currentUser.value !== null)

  const clearErrors = (): void => {
    errorMessage.value = null
    fieldErrors.value = {}
  }

  const applyError = (message?: string, cause?: ValidationErrorCause[]): void => {
    errorMessage.value = message || 'Wystapil nieoczekiwany blad.'

    if (!cause || cause.length === 0) {
      return
    }

    const nextErrors: Record<string, string> = {}
    cause.forEach((item) => {
      if (item?.field) {
        nextErrors[item.field] = item.error || 'Niepoprawna wartosc'
      }
    })
    fieldErrors.value = nextErrors
  }

  const fetchCurrentUser = async (silently = false): Promise<boolean> => {
    isFetchingUser.value = true
    try {
      const response = await window.api.auth.getMe()

      if (!response.success || !response.data) {
        currentUser.value = null
        if (!silently) {
          applyError(response.message)
        }
        return false
      }

      currentUser.value = response.data
      return true
    } catch (error) {
      currentUser.value = null
      if (!silently) {
        errorMessage.value =
          error instanceof Error ? error.message : 'Nie udalo sie pobrac profilu.'
      }
      return false
    } finally {
      isFetchingUser.value = false
    }
  }

  const initSession = async (): Promise<void> => {
    if (initialized.value) {
      return
    }

    if (initSessionPromise) {
      await initSessionPromise
      return
    }

    initSessionPromise = (async () => {
      isInitializing.value = true
      clearErrors()

      try {
        await fetchCurrentUser(true)
        initialized.value = true
      } finally {
        isInitializing.value = false
        initSessionPromise = null
      }
    })()

    await initSessionPromise
  }

  const login = async (payload: LoginPayload): Promise<boolean> => {
    isLoggingIn.value = true
    clearErrors()

    try {
      const response = await window.api.auth.login(payload)

      if (!response.success) {
        applyError(response.message, response.cause)
        return false
      }

      const hasUser = await fetchCurrentUser()
      if (!hasUser) {
        errorMessage.value = 'Zalogowano, ale nie udalo sie pobrac profilu uzytkownika.'
      }

      return hasUser
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Nie udalo sie zalogowac.'
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  const register = async (payload: RegisterPayload): Promise<boolean> => {
    isRegistering.value = true
    clearErrors()

    try {
      const response = await window.api.auth.register({
        email: payload.email,
        nickname: payload.nickname,
        password: payload.password,
        passwordConfirm: payload.confirmPassword
      })

      if (!response.success) {
        applyError(response.message, response.cause)
        return false
      }

      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Nie udalo sie utworzyc konta.'
      return false
    } finally {
      isRegistering.value = false
    }
  }

  const logout = async (): Promise<boolean> => {
    isLoggingOut.value = true
    clearErrors()

    try {
      const response = await window.api.auth.logout()
      currentUser.value = null

      if (!response.success) {
        errorMessage.value = response.message
      }

      return response.success
    } catch (error) {
      currentUser.value = null
      errorMessage.value = error instanceof Error ? error.message : 'Nie udalo sie wylogowac.'
      return false
    } finally {
      isLoggingOut.value = false
    }
  }

  return {
    currentUser,
    initialized,
    isAuthenticated,
    isInitializing,
    isRegistering,
    isLoggingIn,
    isLoggingOut,
    isFetchingUser,
    errorMessage,
    fieldErrors,
    clearErrors,
    fetchCurrentUser,
    initSession,
    register,
    login,
    logout
  }
})
