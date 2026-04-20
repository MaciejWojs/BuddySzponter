// Schemat odpowiedzi użytkownika zwracanej przez backend (np. po logowaniu lub pobraniu profilu).
import z from 'zod'
import zxcvbn from 'zxcvbn'

export const UserResponseSchema = z.object({
  id: z.number().positive().min(1),
  roleId: z.number().positive().min(1).optional(),
  email: z.email(),
  nickname: z.string().max(100),
  avatar: z.string().nullable(),
  isBanned: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional()
})

export const loginInputSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    // .regex(/[@$!%*?&]/) //TODO - dodać wymóg znaku specjalnego do hasła
    .refine((val) => zxcvbn(val).score >= 3)
})

export const registerInputSchema = z
  .object({
    ...loginInputSchema.shape,
    passwordConfirm: z.string().min(8),
    nickname: z.string().min(3).max(20)
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm']
  })

export type UserResponseSchema = z.infer<typeof UserResponseSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
