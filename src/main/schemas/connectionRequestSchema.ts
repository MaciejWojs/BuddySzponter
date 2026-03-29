import z from 'zod'

export const createDeviceSchema = z.object({
  userId: z.number().optional(),
  fingerprint: z.string(),
  os: z.string().optional(),
  name: z.string().default('Unknown Device')
})

export const createConnectionSchemaRequest = z.object({
  password: z.string().min(8).max(64),
  ...createDeviceSchema.shape
})

export const joinConnectionSchemaRequest = z.object({
  connectionCode: z.string().length(8),
  password: z.string().min(8).max(64),
  ...createDeviceSchema.shape
})

export type CreateConnectionInput = z.infer<typeof createConnectionSchemaRequest>
export type JoinConnectionInput = z.infer<typeof joinConnectionSchemaRequest>
