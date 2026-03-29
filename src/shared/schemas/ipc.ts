// shared/types/ipc.ts

import { LanguagesResponse, Translation } from './langSchemas'
import { UserResponseSchema } from './user'

export type ValidationErrorCause = { field: string; error: string }

export type IpcResponse<TData = void> =
  | { success: true; data: TData; message?: string }
  | { success: false; message: string; cause?: ValidationErrorCause[] }
export interface SupportedVersion {
  version: string
  codename: string
  isSupported: boolean
}
//auth
export type LoginRendererResponse = IpcResponse<{ accessTokenSaved: boolean }>
export type RegisterRendererResponse = IpcResponse
export type LogoutRendererResponse = IpcResponse

//core
export type GetAvailableLanguagesResponse = IpcResponse<LanguagesResponse>
export type GetSupportedVersionsResponse = IpcResponse<SupportedVersion[]>
export type GetLocaleResponse = IpcResponse<Translation>

//user
export type UploadAvatarResponse = IpcResponse
export type GetCurrentUserResponse = IpcResponse<UserResponseSchema>
