// Store Pinia zarządzający stanem użytkownika oraz obsługą logowania, rejestracji i sesji.
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
// Typy odpowiedzi i walidacji powiązane z IPC i backendem.
import type { ValidationErrorCause } from '@shared/schemas/ipc'
import type { UserResponseSchema } from '@shared/schemas/user'

// Dane wymagane do logowania użytkownika.
type LoginPayload = {
  email: string
  password: string
}

// Dane wymagane do rejestracji nowego użytkownika.
type RegisterPayload = {
  email: string
  nickname: string
  password: string
  confirmPassword: string
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserResponseSchema | null>(null)
  // Czy store został zainicjalizowany (np. po odświeżeniu aplikacji).
  const initialized = ref(false)

  // Flagi stanu asynchronicznych operacji użytkownika.
  const isInitializing = ref(false)
  const isRegistering = ref(false)
  const isLoggingIn = ref(false)
  const isLoggingOut = ref(false)
  const isFetchingUser = ref(false)

  // Komunikaty błędów globalnych i walidacyjnych.
  const errorMessage = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})
  // Obietnica inicjalizacji sesji (zapobiega wyścigom).
  let initSessionPromise: Promise<void> | null = null

  // Czy użytkownik jest zalogowany (computed na podstawie currentUser).
  const isAuthenticated = computed(() => currentUser.value !== null)

  // Czyści wszystkie błędy (globalne i walidacyjne).
  const clearErrors = (): void => {
    errorMessage.value = null
    fieldErrors.value = {}
  }

  // Przypisuje komunikaty błędów na podstawie odpowiedzi z backendu.
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

  // Pobiera aktualnego użytkownika z backendu (np. po odświeżeniu strony).
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

  // Inicjalizuje sesję użytkownika (np. przy starcie aplikacji).
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

  // Loguje użytkownika na podstawie podanych danych.
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

  // Rejestruje nowego użytkownika na podstawie podanych danych.
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

  // Wylogowuje użytkownika i czyści stan sesji.
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
