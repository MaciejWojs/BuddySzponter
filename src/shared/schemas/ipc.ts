// shared/types/ipc.ts

import { CreateConnectionResponseSchema, JoinConnectionResponseSchema } from './connection'
import { LanguagesResponse, Translation } from './langSchemas'
import { UserResponseSchema } from './user'
import {
  WsConnectionAccepted,
  WsConnectionError,
  WsConnectionRejected,
  WsRequestAccess
} from './ws'

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

//connection
export type CreateConnectionResponse = IpcResponse<CreateConnectionResponseSchema>
export type JoinConnectionResponse = IpcResponse<JoinConnectionResponseSchema>

export type WsConnectResponse = { success: boolean; message?: string }
export type WsActionResponse = { success: boolean; message?: string }

export interface WsServerEvents {
  'ws:connected': { socketId: string }
  'ws:disconnected': { reason: string }
  'ws:connect_error': { message: string }
  'ws:message': unknown

  'ws:request-access': WsRequestAccess
  'ws:access-accepted': WsConnectionAccepted
  'ws:access-rejected': WsConnectionRejected
  'ws:server-error': WsConnectionError
}
