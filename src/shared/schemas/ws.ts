import { z } from 'zod'

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export type WsRole = 'host' | 'guest'

// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------

export const WS_EVENT = {
  REQUEST_ACCESS: 'connection:request-access',
  ACKNOWLEDGE: 'connection:acknowledge',
  ACCEPTED: 'connection:accepted',
  REJECTED: 'connection:rejected',
  ACKNOWLEDGED: 'connection:acknowledged',
  ACCEPT: 'connection:accept',
  REJECT: 'connection:reject',
  DISCONNECT: 'connection:disconnect',
  DISCONNECTED: 'connection:disconnected',
  TERMINATE: 'connection:terminate',
  ERROR: 'connection:error',
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice-candidate',
  WEBRTC_READY: 'webrtc:ready'
} as const

export type WsEventName = (typeof WS_EVENT)[keyof typeof WS_EVENT]

// ---------------------------------------------------------------------------
// Payload schemas
// ---------------------------------------------------------------------------

const ConnectionAcceptedEventSchema = z.object({
  sessionId: z.uuid()
})

const ConnectionRejectedEventSchema = z.object({
  sessionId: z.uuid()
})

const ConnectionDisconnectedEventSchema = z.object({
  reason: z.string().optional()
})

const TerminateConnectionEventSchema = z.object({
  reason: z.string().optional()
})

const ConnectionErrorEventSchema = z.object({
  message: z.string(),
  code: z.number().optional()
})

const RequestAccessEventSchema = z.object({
  sessionId: z.uuid()
})

const acknowledgedSchema = z.object({
  sessionId: z.uuid()
})

const AcceptEventSchema = z.object({
  sessionId: z.uuid()
})

const RejectEventSchema = z.object({
  sessionId: z.uuid()
})

const AcknowledgeEventSchema = z.object({
  sessionId: z.uuid()
})

const EmptyPayloadSchema = z.object({}).strict()

/** Server may send a plain string reason or an object. */
const ManualDisconnectListenSchema = z.union([z.string(), ConnectionDisconnectedEventSchema])

const WebRTCOfferEventSchema = z.object({
  sdp: z.string()
})

const WebRTCAnswerEventSchema = z.object({
  sdp: z.string()
})

const WebRTCIceCandidateEventSchema = z.object({
  candidate: z.any()
})

const WebRTCReadyEventSchema = z.object({})

// ---------------------------------------------------------------------------
// Inferred payload types (kept for backward compatibility)
// ---------------------------------------------------------------------------

export type WsConnectionAccepted = z.infer<typeof ConnectionAcceptedEventSchema>
export type WsConnectionRejected = z.infer<typeof ConnectionRejectedEventSchema>
export type WsConnectionDisconnected = z.infer<typeof ConnectionDisconnectedEventSchema>
export type WsTerminateConnection = z.infer<typeof TerminateConnectionEventSchema>
export type WsConnectionError = z.infer<typeof ConnectionErrorEventSchema>
export type WsRequestAccess = z.infer<typeof RequestAccessEventSchema>
export type WsAcknowledged = z.infer<typeof acknowledgedSchema>

export type WsWebRTCOffer = z.infer<typeof WebRTCOfferEventSchema>
export type WsWebRTCAnswer = z.infer<typeof WebRTCAnswerEventSchema>
export type WsWebRTCIceCandidate = z.infer<typeof WebRTCIceCandidateEventSchema>
export type WsWebRTCReady = z.infer<typeof WebRTCReadyEventSchema>

// ---------------------------------------------------------------------------
// Schema registries (emit vs listen — payloads can differ per direction)
// ---------------------------------------------------------------------------

export const EMIT_EVENT_SCHEMAS: Record<WsEventName, z.ZodType> = {
  [WS_EVENT.REQUEST_ACCESS]: RequestAccessEventSchema,
  [WS_EVENT.ACKNOWLEDGE]: AcknowledgeEventSchema,
  [WS_EVENT.ACCEPTED]: ConnectionAcceptedEventSchema,
  [WS_EVENT.REJECTED]: ConnectionRejectedEventSchema,
  [WS_EVENT.ACKNOWLEDGED]: acknowledgedSchema,
  [WS_EVENT.ACCEPT]: AcceptEventSchema,
  [WS_EVENT.REJECT]: RejectEventSchema,
  [WS_EVENT.DISCONNECT]: EmptyPayloadSchema,
  [WS_EVENT.DISCONNECTED]: ConnectionDisconnectedEventSchema,
  [WS_EVENT.TERMINATE]: TerminateConnectionEventSchema,
  [WS_EVENT.ERROR]: ConnectionErrorEventSchema,
  [WS_EVENT.WEBRTC_OFFER]: WebRTCOfferEventSchema,
  [WS_EVENT.WEBRTC_ANSWER]: WebRTCAnswerEventSchema,
  [WS_EVENT.WEBRTC_ICE_CANDIDATE]: WebRTCIceCandidateEventSchema,
  [WS_EVENT.WEBRTC_READY]: WebRTCReadyEventSchema
}

export const LISTEN_EVENT_SCHEMAS: Record<WsEventName, z.ZodType> = {
  [WS_EVENT.REQUEST_ACCESS]: RequestAccessEventSchema,
  [WS_EVENT.ACKNOWLEDGE]: AcknowledgeEventSchema,
  [WS_EVENT.ACCEPTED]: ConnectionAcceptedEventSchema,
  [WS_EVENT.REJECTED]: ConnectionRejectedEventSchema,
  [WS_EVENT.ACKNOWLEDGED]: acknowledgedSchema,
  [WS_EVENT.ACCEPT]: AcceptEventSchema,
  [WS_EVENT.REJECT]: RejectEventSchema,
  [WS_EVENT.DISCONNECT]: ManualDisconnectListenSchema,
  [WS_EVENT.DISCONNECTED]: ConnectionDisconnectedEventSchema,
  [WS_EVENT.TERMINATE]: TerminateConnectionEventSchema,
  [WS_EVENT.ERROR]: ConnectionErrorEventSchema,
  [WS_EVENT.WEBRTC_OFFER]: WebRTCOfferEventSchema,
  [WS_EVENT.WEBRTC_ANSWER]: WebRTCAnswerEventSchema,
  [WS_EVENT.WEBRTC_ICE_CANDIDATE]: WebRTCIceCandidateEventSchema,
  [WS_EVENT.WEBRTC_READY]: WebRTCReadyEventSchema
}

// ---------------------------------------------------------------------------
// Role direction maps
// ---------------------------------------------------------------------------

const COMMON_EMIT: readonly WsEventName[] = [
  WS_EVENT.WEBRTC_OFFER,
  WS_EVENT.WEBRTC_ANSWER,
  WS_EVENT.WEBRTC_ICE_CANDIDATE,
  WS_EVENT.WEBRTC_READY,
  WS_EVENT.DISCONNECT,
  WS_EVENT.TERMINATE
]

const COMMON_LISTEN: readonly WsEventName[] = [
  WS_EVENT.ACKNOWLEDGED,
  WS_EVENT.DISCONNECTED,
  WS_EVENT.TERMINATE,
  WS_EVENT.ERROR,
  WS_EVENT.WEBRTC_OFFER,
  WS_EVENT.WEBRTC_ANSWER,
  WS_EVENT.WEBRTC_ICE_CANDIDATE,
  WS_EVENT.WEBRTC_READY,
  WS_EVENT.DISCONNECT
]

const ROLE_EMIT: Record<WsRole, readonly WsEventName[]> = {
  host: [...COMMON_EMIT, WS_EVENT.ACCEPT, WS_EVENT.REJECT, WS_EVENT.ACKNOWLEDGED],
  guest: [...COMMON_EMIT, WS_EVENT.REQUEST_ACCESS, WS_EVENT.ACKNOWLEDGE]
}

const ROLE_LISTEN: Record<WsRole, readonly WsEventName[]> = {
  host: [...COMMON_LISTEN, WS_EVENT.REQUEST_ACCESS],
  guest: [...COMMON_LISTEN, WS_EVENT.ACCEPTED, WS_EVENT.REJECTED]
}

export function canRoleEmit(role: WsRole, event: WsEventName): boolean {
  return ROLE_EMIT[role].includes(event)
}

export function canRoleListen(role: WsRole, event: WsEventName): boolean {
  return ROLE_LISTEN[role].includes(event)
}
