import { z } from 'zod'

export const handshakeResponseSchema = z.object({
  serverPublicKey: z
    .string({
      message: 'Missing server public key'
    })
    .min(1, { message: 'Server public key cannot be empty' }),

  sessionId: z.uuid({
    message: 'Session ID must be a valid UUID'
  })
})

export type HandshakeResponse = z.infer<typeof handshakeResponseSchema>
