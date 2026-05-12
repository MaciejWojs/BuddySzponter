/**
 * Parses clipboard text produced by the host share action:
 * session code: {8 alnum}
 * password: {single line}
 */
export function parseHostSessionShareClipboard(text: string): { codeRaw: string; password: string } | null {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const match = normalized.match(/^session\s+code:\s*([^\n]+?)\s*\n+\s*password:\s*([^\r\n]*)$/im)
  if (!match) return null

  const codeRaw = match[1].replace(/\s/g, '')
  const password = match[2].trim()

  if (!/^[a-zA-Z0-9]{8}$/.test(codeRaw)) return null

  return { codeRaw, password }
}
