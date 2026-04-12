import { z } from 'zod'
import { loginInputSchema, registerInputSchema } from '../../shared/schemas/user'

export const LoginRequestSchema = z.object({
  ...loginInputSchema.shape,
  fingerprint: z.string(),
  os: z.string().optional().default(''),
  name: z.string().optional().default('')
})

export const RegisterRequestSchema = z
  .object({
    ...registerInputSchema.shape
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm']
  })

// Schemat ciasteczka z tokenem odświeżania.
export const refreshTokenCookieSchema = z.object({
  refreshToken: z.jwt()
})

// Typy wejściowe dla logowania i rejestracji.
export type RefreshTokenCookie = z.infer<typeof refreshTokenCookieSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
