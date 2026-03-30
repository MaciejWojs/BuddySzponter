import { CreateConnectionResponseSchema, JoinConnectionResponseSchema } from './connection'
import { LanguagesResponse, Translation } from './langSchemas'
import { UserResponseSchema } from './user'
import {
  WsAcknowledged,
  WsConnectionAccepted,
  WsConnectionError,
  WsConnectionRejected,
  WsRequestAccess,
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady,
  WsConnectionDisconnected
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

// --- AUTH ---
export type LoginRendererResponse = IpcResponse<{ accessTokenSaved: boolean }>
export type RegisterRendererResponse = IpcResponse
export type LogoutRendererResponse = IpcResponse

// --- CORE ---
export type GetAvailableLanguagesResponse = IpcResponse<LanguagesResponse>
export type GetSupportedVersionsResponse = IpcResponse<SupportedVersion[]>
export type GetLocaleResponse = IpcResponse<Translation>

// --- USER ---
export type UploadAvatarResponse = IpcResponse
export type GetCurrentUserResponse = IpcResponse<UserResponseSchema>

// --- CONNECTION ---
export type CreateConnectionResponse = IpcResponse<CreateConnectionResponseSchema>
export type JoinConnectionResponse = IpcResponse<JoinConnectionResponseSchema>

// --- WEBSOCKET / IPC ACTIONS RESPONSES ---
export type WsConnectResponse = { success: boolean; message?: string }
export type WsActionResponse = { success: boolean; message?: string }

export interface WsServerEvents {
  // Systemowe Socket.io
  'ws:connected': { socketId: string }
  'ws:disconnected': WsConnectionDisconnected
  'ws:connect_error': { message: string }
  'ws:message': unknown

  // Biznesowe: Handshake i Dostęp
  'ws:request-access': WsRequestAccess
  'ws:access-accepted': WsConnectionAccepted
  'ws:access-rejected': WsConnectionRejected
  'ws:server-error': WsConnectionError
  'ws:acknowledged': WsAcknowledged

  // WebRTC Signaling
  'webrtc:offer': WsWebRTCOffer
  'webrtc:answer': WsWebRTCAnswer
  'webrtc:ice-candidate': WsWebRTCIceCandidate
  'webrtc:ready': WsWebRTCReady
}
