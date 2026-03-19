import { z } from 'zod'

export const ApiResultSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), z.any()).optional(),
  code: z.number().optional(),
  error: z
    .object({
      message: z.string()
    })
    .optional(),
  cause: z
    .array(
      z.object({
        field: z.string(),
        error: z.string()
      })
    )
    .optional(),
  message: z.string().optional()
})
export type ApiResult = z.infer<typeof ApiResultSchema>

export const ErrorResponseSchema = z.object({
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
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const RegisterApiResultSchema = ApiResultSchema.extend({
  data: z
    .object({
      message: z.string()
    })
    .optional(),
  error: z
    .object({
      message: z.string()
    })
    .optional(),
  cause: z
    .array(
      z.object({
        field: z.string(),
        error: z.string()
      })
    )
    .optional()
})
export type RegisterApiResult = z.infer<typeof RegisterApiResultSchema>

export const LoginApiResultSchema = z.object({
  success: z.boolean(),
  code: z.number().optional(),
  data: z
    .object({
      accessToken: z.string(),
      message: z.string()
    })
    .optional(),
  error: z
    .object({
      message: z.string()
    })
    .optional(),
  cause: z
    .array(
      z.object({
        field: z.string(),
        error: z.string()
      })
    )
    .optional()
})
export type LoginApiResult = z.infer<typeof LoginApiResultSchema>
