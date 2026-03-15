import { z } from 'zod'

export const loginInputSchema = z.object({
  email: z.email({
    message: 'Invalid email format',
    pattern: z.regexes?.email
  }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' })
})

export const loginResponseSchema = z.object({
  message: z.string()
})

export const registerInputSchema = z
  .object({
    nickname: z.string().min(3, { message: 'Nickname must be at least 3 characters' }),
    email: z.email({
      message: 'Invalid email address format',
      pattern: z.regexes?.email
    }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    passwordConfirm: z.string()
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm']
  })

export const registerResponseSchema = z.object({
  message: z.string()
})

export const apiErrorSchema = z.object({
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

export type RegisterInput = z.infer<typeof registerInputSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>

export type LoginInput = z.infer<typeof loginInputSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>
