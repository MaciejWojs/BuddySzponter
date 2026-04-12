import z from 'zod'

export const createConnectionSchema = z.object({
  password: z.string().min(8).max(255),
  userId: z.number().optional()
})

export const createConnectionSchemaResponse = z.object({
  code: z.string(),
  connectionUUID: z.uuid(),
  token: z.string(),
  expiresAt: z.coerce.date()
})

export const joinConnectionSchema = z.object({
  connectionCode: z.string().length(8),
  password: z.string().min(8).max(64)
})

export const joinConnectionSchemaResponse = z.object({
  connectionUUID: z.uuid(),
  token: z.string()
})

export type CreateConnectionRequestSchema = z.infer<typeof createConnectionSchema>
export type CreateConnectionResponseSchema = z.infer<typeof createConnectionSchemaResponse>

export type JoinConnectionRequestSchema = z.infer<typeof joinConnectionSchema>
export type JoinConnectionResponseSchema = z.infer<typeof joinConnectionSchemaResponse>
