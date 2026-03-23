// src/schemas/authSchemas.ts
import { z } from 'zod'
import zxcvbn from 'zxcvbn'

export const registerInputSchema = z
  .object({
    nickname: z
      .string()
      .min(3, { message: 'nickname have to be at least 3 characters long' })
      .max(20, { message: 'nickname can be at most 20 characters long' }),

    email: z.email({ message: 'Please provide a valid email address' }),

    password: z
      .string()
      .min(8, { message: 'password must be at least 8 characters long' })
      .regex(/[A-Z]/, { message: 'password must contain an uppercase letter' })
      .regex(/[0-9]/, { message: 'password must contain a digit' })
      .refine((val) => zxcvbn(val).score >= 3, {
        message: 'Password is too weak (min. zxcvbn score: 3)'
      }),

    passwordConfirm: z.string()
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm']
  })

export const loginInputSchema = z.object({
  email: z.email({ message: 'Please provide a valid email address' }),
  password: z.string().min(1, { message: 'Password cannot be empty' }),
  fingerprint: z.string(),
  os: z.string().optional().default(''),
  name: z.string().optional().default('')
})

export const refreshTokenCookieSchema = z.object({
  refreshToken: z.jwt()
})

export type RefreshTokenCookie = z.infer<typeof refreshTokenCookieSchema>

export type LoginInput = z.infer<typeof loginInputSchema>

export type RegisterInput = z.infer<typeof registerInputSchema>
