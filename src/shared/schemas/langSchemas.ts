import { z } from 'zod'

export const AppLanguageSchema = z.enum(['pl', 'en', 'plX67'])
export type AppLanguage = z.infer<typeof AppLanguageSchema>

export const LanguagesResponseSchema = z.array(z.enum(['en', 'pl', 'plX67', 'it']))
export type LanguagesResponse = z.infer<typeof LanguagesResponseSchema>

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
