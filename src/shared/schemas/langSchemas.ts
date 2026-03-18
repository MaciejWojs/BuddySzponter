export const AppLanguageSchema = z.enum(['pl', 'en', '67'])
export type AppLanguage = z.infer<typeof AppLanguageSchema>
import { z } from 'zod'

const JSONValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSONValueSchema),
    z.record(z.string(), JSONValueSchema)
  ])
)

export const TranslationSchema = z.record(z.string(), JSONValueSchema)

export type Translation = z.infer<typeof TranslationSchema>
