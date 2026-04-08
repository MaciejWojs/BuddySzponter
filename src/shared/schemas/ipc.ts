// shared/types/ipc.ts

import { LanguagesResponse, Translation } from './langSchemas'
import { UserResponseSchema } from './user'

// Struktura pojedynczego błędu walidacji (np. dla pola formularza).
export type ValidationErrorCause = { field: string; error: string }

// Ogólny typ odpowiedzi IPC (success/fail, dane, komunikat, opcjonalnie przyczyny błędów).
export type IpcResponse<TData = void> =
  | { success: true; data: TData; message?: string }
  | { success: false; message: string; cause?: ValidationErrorCause[] }

export interface SupportedVersion {
  version: string
  codename: string
  isSupported: boolean
}

// Odpowiedzi IPC związane z autoryzacją użytkownika.
export type LoginRendererResponse = IpcResponse<{ accessTokenSaved: boolean }>
export type RegisterRendererResponse = IpcResponse
export type LogoutRendererResponse = IpcResponse

// Odpowiedzi IPC związane z funkcjami core aplikacji.
export type GetAvailableLanguagesResponse = IpcResponse<LanguagesResponse>
export type GetSupportedVersionsResponse = IpcResponse<SupportedVersion[]>
export type GetLocaleResponse = IpcResponse<Translation>

// Odpowiedzi IPC związane z użytkownikiem.
export type UploadAvatarResponse = IpcResponse
export type GetCurrentUserResponse = IpcResponse<UserResponseSchema>
