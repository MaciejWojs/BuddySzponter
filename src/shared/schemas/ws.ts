import { z } from 'zod'

export const ConnectionAcceptedEventSchema = z.object({
  sessionId: z.uuid()
})

export const ConnectionRejectedEventSchema = z.object({
  sessionId: z.uuid()
})

export const ConnectionDisconnectedEventSchema = z.object({
  reason: z.string().optional()
})

export const TerminateConnectionEventSchema = z.object({
  reason: z.string().optional()
})

export const KickFromConnectionEventSchema = z.object({
  reason: z.string().optional()
})

export const ConnectionErrorEventSchema = z.object({
  message: z.string(),
  code: z.number().optional()
})

export const RequestAccessEventSchema = z.object({
  sessionId: z.uuid()
})

export const acknowledgedSchema = z.object({
  sessionId: z.uuid()
})

// --- NOWE: Schematy WebRTC ---

export const WebRTCOfferEventSchema = z.object({
  sdp: z.string()
})

export const WebRTCAnswerEventSchema = z.object({
  sdp: z.string()
})

export const WebRTCIceCandidateEventSchema = z.object({
  candidate: z.any()
})

export const WebRTCReadyEventSchema = z.object({})

export type WsConnectionAccepted = z.infer<typeof ConnectionAcceptedEventSchema>
export type WsConnectionRejected = z.infer<typeof ConnectionRejectedEventSchema>
export type WsConnectionDisconnected = z.infer<typeof ConnectionDisconnectedEventSchema>
export type WsTerminateConnection = z.infer<typeof TerminateConnectionEventSchema>
export type WsKickFromConnection = z.infer<typeof KickFromConnectionEventSchema>
export type WsConnectionError = z.infer<typeof ConnectionErrorEventSchema>
export type WsRequestAccess = z.infer<typeof RequestAccessEventSchema>
export type WsAcknowledged = z.infer<typeof acknowledgedSchema>

export type WsWebRTCOffer = z.infer<typeof WebRTCOfferEventSchema>
export type WsWebRTCAnswer = z.infer<typeof WebRTCAnswerEventSchema>
export type WsWebRTCIceCandidate = z.infer<typeof WebRTCIceCandidateEventSchema>
export type WsWebRTCReady = z.infer<typeof WebRTCReadyEventSchema>
