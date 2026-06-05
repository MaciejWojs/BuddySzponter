import { z } from 'zod'

export const loginPayloadSchema = z.object({
  message: z.string(),
  accessToken: z.jwt()
})

export const registerPayloadSchema = z.object({
  message: z.string()
})

export const errorResponseSchema = z.object({
  message: z.string(),
  cause: z
    .array(
      z.object({
        field: z.string(),
        error: z.string()
      })
    )
    .optional()
})
