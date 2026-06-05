import z from 'zod'

export const appVersionSchema = z.object({
  version: z.string().min(1),
  codename: z.string().nullable(),
  isSupported: z.boolean()
})

export type AppVersion = z.infer<typeof appVersionSchema>
