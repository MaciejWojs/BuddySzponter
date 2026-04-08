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

export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
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

// --- DESKTOP ---
export type GetDesktopSourcesResponse = IpcResponse<DesktopSource[]>

export type WsCategory = 'ws:connection' | 'ws:access' | 'ws:handshake' | 'ws:webrtc'

/**
 * Generyczny kształt paczki danych
 */
export interface WsEvent<T extends string, D> {
  type: T
  data: D
}

// --- 1. KATEGORIA: CONNECTION ---
export type WsConnectionEvent =
  | WsEvent<'connected', { socketId: string }>
  | WsEvent<'disconnected', WsConnectionDisconnected>
  | WsEvent<'connect_error', { message: string }>

// --- 2. KATEGORIA: ACCESS ---
export type WsAccessEvent =
  | WsEvent<'request-access', WsRequestAccess>
  | WsEvent<'accepted', WsConnectionAccepted>
  | WsEvent<'rejected', WsConnectionRejected>
  | WsEvent<'server-error', WsConnectionError>

// --- 3. KATEGORIA: HANDSHAKE ---
export type WsHandshakeEvent = WsEvent<'acknowledged', WsAcknowledged>

// --- 4. KATEGORIA: WEBRTC ---
export type WsWebRtcEvent =
  | WsEvent<'offer', WsWebRTCOffer>
  | WsEvent<'answer', WsWebRTCAnswer>
  | WsEvent<'ice-candidate', WsWebRTCIceCandidate>
  | WsEvent<'ready', WsWebRTCReady>

/**
 * MAPOWANIE KANAŁÓW NA TYPY EVENTÓW
 * To tego używa Twoja metoda notifyFrontend w Main i Preload
 */
export interface WsServerEvents {
  'ws:connection': WsConnectionEvent
  'ws:access': WsAccessEvent
  'ws:handshake': WsHandshakeEvent
  'ws:webrtc': WsWebRtcEvent
}

// ==========================================
// --- ODPOWIEDZI NA AKCJE (INVOKE) ---
// ==========================================

export type WsConnectResponse = { success: boolean; message?: string }
export type WsActionResponse = { success: boolean; message?: string }

export interface WsConnectionListeners {
  onConnected: (data: { socketId: string }) => void
  onDisconnected: (data: WsConnectionDisconnected) => void
  onConnectError: (data: { message: string }) => void
}

export interface WsAccessListeners {
  onRequest: (data: WsRequestAccess) => void
  onAccepted: (data: WsConnectionAccepted) => void
  onRejected: (data: WsConnectionRejected) => void
  onError: (data: WsConnectionError) => void
}

export interface WsHandshakeListeners {
  onAcknowledged: (data: WsAcknowledged) => void
}

export interface WsWebRtcListeners {
  onOffer: (data: WsWebRTCOffer) => void
  onAnswer: (data: WsWebRTCAnswer) => void
  onIceCandidate: (data: WsWebRTCIceCandidate) => void
  onReady: (data: WsWebRTCReady) => void
}
