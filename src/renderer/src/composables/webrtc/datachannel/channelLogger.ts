import { z } from 'zod'

export type ChannelErrorKind = 'json' | 'schema' | 'send' | 'lifecycle'

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}

export function logChannelError(
  channelLabel: string,
  kind: ChannelErrorKind,
  error: unknown,
  rawPreview?: string
): void {
  const prefix = `[DataChannel:${channelLabel}]`

  if (kind === 'schema' && error instanceof z.ZodError) {
    console.warn(prefix, 'Structural validation failed — message ignored', {
      issues: error.issues,
      summary: formatZodIssues(error),
      rawPreview: rawPreview?.slice(0, 200)
    })
    return
  }

  console.warn(
    prefix,
    `${kind} error`,
    error,
    rawPreview ? { rawPreview: rawPreview.slice(0, 200) } : undefined
  )
}
