import { z } from 'zod'

export type ApiResult<T = unknown> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: unknown }

export const ApiResultSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  data: z.unknown().optional(),
  error: z.unknown().optional()
})
