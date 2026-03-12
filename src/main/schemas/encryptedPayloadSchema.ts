import { z } from 'zod'

export const encryptedPayloadSchema = z.object({
  payload: z.object({
    iv: z.string(),
    tag: z.string(),
    data: z.string()
  })
})

export type EncryptedPayload = {
  payload: {
    iv: string
    tag: string
    data: string
  }
}
