import z from 'zod'

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

export type UserResponseSchema = z.infer<typeof UserResponseSchema>
