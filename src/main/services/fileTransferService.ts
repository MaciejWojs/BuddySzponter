import { ipcMain, dialog, BrowserWindow, type OpenDialogOptions } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

const MAX_SEND_PATHS = 64
const MAX_READ_CHUNK = 64 * 1024
const MAX_FILE_BYTES = 500 * 1024 * 1024

/** Ścieżki zarejestrowane do odczytu (schowek / wybór użytkownika). */
const allowedReadPaths = new Set<string>()

const receiveSessions = new Map<string, { paths: string[] }>()

function normalizePath(p: string): string {
  return path.normalize(path.resolve(p))
}

export function registerFileTransferHandlers(): void {
  ipcMain.handle('file-transfer:pick-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const opts: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] }
    const { canceled, filePaths } =
      win && !win.isDestroyed()
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts)
    if (canceled || !filePaths[0]) return null
    return normalizePath(filePaths[0])
  })

  ipcMain.handle('file-transfer:pick-files', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const opts: OpenDialogOptions = { properties: ['openFile', 'multiSelections'] }
    const { canceled, filePaths } =
      win && !win.isDestroyed()
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts)
    if (canceled || !filePaths.length) return []
    const out: string[] = []
    for (const fp of filePaths) {
      if (typeof fp !== 'string' || !fp) continue
      out.push(normalizePath(fp))
      if (out.length >= MAX_SEND_PATHS) break
    }
    return out
  })

  ipcMain.handle('file-transfer:register-send-paths', (_e, paths: unknown) => {
    if (!Array.isArray(paths)) return false
    let n = 0
    for (const p of paths) {
      if (typeof p !== 'string' || !p) continue
      allowedReadPaths.add(normalizePath(p))
      n++
      if (n >= MAX_SEND_PATHS) break
    }
    return n > 0
  })

  ipcMain.handle('file-transfer:clear-send-paths', (_e, paths: unknown) => {
    if (!Array.isArray(paths)) {
      allowedReadPaths.clear()
      return
    }
    for (const p of paths) {
      if (typeof p === 'string') allowedReadPaths.delete(normalizePath(p))
    }
  })

  ipcMain.handle('file-transfer:stat-files', async (_e, paths: unknown) => {
    if (!Array.isArray(paths)) return []
    const out: { path: string; name: string; size: number }[] = []
    for (const p of paths) {
      if (typeof p !== 'string') continue
      const abs = normalizePath(p)
      if (!allowedReadPaths.has(abs)) continue
      try {
        const st = await fs.stat(abs)
        if (!st.isFile() || st.size > MAX_FILE_BYTES) continue
        out.push({ path: abs, name: path.basename(abs), size: st.size })
        if (out.length >= MAX_SEND_PATHS) break
      } catch {
        // ignoruj
      }
    }
    return out
  })

  ipcMain.handle(
    'file-transfer:read-chunk',
    async (_e, payload: { path: string; offset: number; length: number }) => {
      const abs = normalizePath(payload.path)
      if (!allowedReadPaths.has(abs)) return null
      const { offset, length } = payload
      if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(length) || length <= 0)
        return null
      if (length > MAX_READ_CHUNK) return null
      try {
        const st = await fs.stat(abs)
        if (!st.isFile() || offset >= st.size) return new ArrayBuffer(0)
        const toRead = Math.min(length, st.size - offset)
        const fh = await fs.open(abs, 'r')
        try {
          const buf = Buffer.alloc(toRead)
          const { bytesRead } = await fh.read(buf, 0, toRead, offset)
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead)
        } finally {
          await fh.close()
        }
      } catch {
        return null
      }
    }
  )

  ipcMain.handle(
    'file-transfer:register-receive',
    (_e, payload: { transferId: string; outputPaths: string[] }) => {
      if (typeof payload?.transferId !== 'string' || !Array.isArray(payload.outputPaths))
        return false
      const paths = payload.outputPaths
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .map((x) => normalizePath(x))
      if (paths.length === 0 || paths.length > MAX_SEND_PATHS) return false
      receiveSessions.set(payload.transferId, { paths })
      return true
    }
  )

  ipcMain.handle(
    'file-transfer:append-chunk',
    async (_e, payload: { transferId: string; fileIndex: number; data: ArrayBuffer }) => {
      const sess = receiveSessions.get(payload.transferId)
      if (!sess) return false
      const { fileIndex, data } = payload
      if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= sess.paths.length)
        return false
      const outPath = sess.paths[fileIndex]
      if (!outPath) return false
      const buf = Buffer.from(data)
      try {
        await fs.appendFile(outPath, buf)
        return true
      } catch {
        return false
      }
    }
  )

  ipcMain.handle('file-transfer:create-empty-files', async (_e, outputPaths: unknown) => {
    if (!Array.isArray(outputPaths)) return false
    const paths = outputPaths.filter((x): x is string => typeof x === 'string').map(normalizePath)
    for (const p of paths) {
      try {
        await fs.mkdir(path.dirname(p), { recursive: true })
        await fs.writeFile(p, Buffer.alloc(0))
      } catch {
        return false
      }
    }
    return true
  })

  ipcMain.handle('file-transfer:unregister-receive', (_e, transferId: unknown) => {
    if (typeof transferId === 'string') receiveSessions.delete(transferId)
  })
}
