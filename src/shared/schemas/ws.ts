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

export type WsConnectionAccepted = z.infer<typeof ConnectionAcceptedEventSchema>
export type WsConnectionRejected = z.infer<typeof ConnectionRejectedEventSchema>
export type WsConnectionDisconnected = z.infer<typeof ConnectionDisconnectedEventSchema>
export type WsTerminateConnection = z.infer<typeof TerminateConnectionEventSchema>
export type WsKickFromConnection = z.infer<typeof KickFromConnectionEventSchema>
export type WsConnectionError = z.infer<typeof ConnectionErrorEventSchema>
export type WsRequestAccess = z.infer<typeof RequestAccessEventSchema>
