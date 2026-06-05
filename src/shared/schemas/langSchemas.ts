import { z } from 'zod'

const appLanguageSchema = z.enum([
  'pl',
  'en',
  'plX67',
  'it',
  'er',
  'de',
  'fr',
  'es',
  'cn',
  'jp',
  'kr',
  'id',
  'sa',
  'bd',
  'br',
  'us'
])
export type AppLanguage = z.infer<typeof appLanguageSchema>

export const LanguagesResponseSchema = z.array(appLanguageSchema)
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
