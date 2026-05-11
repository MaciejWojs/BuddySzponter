import {
  webRtcService,
  type DataChannelLabel
} from '@renderer/composables/connection/webRTCService'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import {
  decodeFileChunkFrame,
  encodeFileChunkFrame
} from '@renderer/composables/fileTransfer/binaryFrame'

const CHUNK_PAYLOAD = 32 * 1024
const BUFFERED_HIGH_WATER = 2 * 1024 * 1024
const DOWNLOAD_DIR_KEY = 'fileTransferDownloadDir'

type FileSource = 'clipboard' | 'chat' | 'manual'

type ActiveReceive = {
  transferId: string
  files: { name: string; size: number }[]
  outputPaths: string[]
  currentFileIndex: number
  nextChunkIndex: number
  bytesInCurrentFile: number
}

type ActiveSend = {
  transferId: string
  files: { path: string; name: string; size: number }[]
  source: FileSource
}

export type OutgoingFileOfferMeta = {
  transferId: string
  files: { name: string; size: number }[]
}

type RelayPending = {
  resolve: (v: OutgoingFileOfferMeta | null) => void
  timer: ReturnType<typeof setTimeout>
}

let activeReceive: ActiveReceive | null = null
let activeSend: ActiveSend | null = null

const relayPending = new Map<string, RelayPending>()

function getDownloadDir(): string | null {
  try {
    return sessionStorage.getItem(DOWNLOAD_DIR_KEY)
  } catch {
    return null
  }
}

function setDownloadDir(dir: string): void {
  try {
    sessionStorage.setItem(DOWNLOAD_DIR_KEY, dir)
  } catch {
    // ignore
  }
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'plik'
  return base.slice(0, 200)
}

async function waitBuffered(channel: RTCDataChannel): Promise<void> {
  while (channel.bufferedAmount > BUFFERED_HIGH_WATER) {
    await new Promise<void>((r) => setTimeout(r, 8))
  }
}

async function ensureDownloadDir(): Promise<string | null> {
  let dir = getDownloadDir()
  if (dir) return dir

  if (window.api?.fileTransfer?.getDownloadsPath) {
    try {
      const d = await window.api.fileTransfer.getDownloadsPath()
      if (d) {
        setDownloadDir(d)
        return getDownloadDir()
      }
    } catch {
      // ignore
    }
  }

  if (window.api?.fileTransfer?.pickDirectory) {
    dir = await window.api.fileTransfer.pickDirectory()
    if (dir) setDownloadDir(dir)
  }
  return getDownloadDir()
}

export function getFileTransferDownloadDirectory(): string | null {
  return getDownloadDir()
}

export function setFileTransferDownloadDirectory(dir: string): void {
  const t = dir.trim()
  if (t) setDownloadDir(t)
}

export function resetFileTransferState(): void {
  for (const [, p] of relayPending) {
    clearTimeout(p.timer)
    p.resolve(null)
  }
  relayPending.clear()
  activeReceive = null
  activeSend = null
}

export function resolveRelayFileStarted(
  correlationId: unknown,
  result: OutgoingFileOfferMeta | null
): void {
  if (typeof correlationId !== 'string' || !correlationId) return
  const pending = relayPending.get(correlationId)
  if (!pending) return
  relayPending.delete(correlationId)
  clearTimeout(pending.timer)
  pending.resolve(result)
}

async function beginOutgoingFromPaths(
  paths: string[],
  source: FileSource
): Promise<OutgoingFileOfferMeta | null> {
  if (!paths.length || activeSend) return null
  if (!window.api?.fileTransfer?.registerSendPaths) return null

  await window.api.fileTransfer.registerSendPaths(paths)
  const stats = await window.api.fileTransfer.statFiles(paths)

  const ch = webRtcService.fileTransferChannel
  if (!stats.length || !ch || ch.readyState !== 'open') {
    await window.api.fileTransfer.clearSendPaths?.(paths)
    return null
  }

  const transferId = crypto.randomUUID()
  activeSend = {
    transferId,
    files: stats.map((s) => ({ path: s.path, name: s.name, size: s.size })),
    source
  }

  webRtcService.sendData(
    'file-transfer',
    JSON.stringify({
      type: 'FILE_OFFER',
      payload: {
        transferId,
        source,
        files: stats.map((s) => ({ name: s.name, size: s.size }))
      }
    })
  )

  return {
    transferId,
    files: stats.map((s) => ({ name: s.name, size: s.size }))
  }
}

/** Okno gościa (właściciel DC): rozpocznij transfer z żądania relay i zgłoś wynik do okna głównego. */
export async function completeRelayOutgoingFileTransfer(
  paths: string[],
  source: FileSource,
  correlationId: unknown
): Promise<void> {
  const hid = useHidChannel()
  if (!hid.isControlGranted.value || !paths.length) {
    try {
      const bc = new BroadcastChannel('guest-sync-channel')
      bc.postMessage({ type: 'RELAY_FILE_STARTED', correlationId, result: null })
      bc.close()
    } catch {
      // ignore
    }
    return
  }

  const meta = await beginOutgoingFromPaths(paths, source)
  try {
    const bc = new BroadcastChannel('guest-sync-channel')
    bc.postMessage({ type: 'RELAY_FILE_STARTED', correlationId, result: meta })
    bc.close()
  } catch {
    // ignore
  }
}

export async function requestOutgoingFileTransferFromPaths(
  paths: string[],
  options: { source: FileSource; useClipboardPolicy: boolean }
): Promise<OutgoingFileOfferMeta | null> {
  const hid = useHidChannel()
  if (options.useClipboardPolicy) {
    if (!hid.clipboardSyncEnabled.value || !hid.isControlGranted.value) return null
  } else if (!hid.isControlGranted.value) {
    return null
  }

  if (!paths.length || activeSend) return null

  const ch = webRtcService.fileTransferChannel
  if (ch?.readyState === 'open') {
    return beginOutgoingFromPaths(paths, options.source)
  }

  if (window.location.hash.toLowerCase().includes('guest')) {
    return null
  }

  const correlationId = crypto.randomUUID()
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      relayPending.delete(correlationId)
      resolve(null)
    }, 30_000)
    relayPending.set(correlationId, { resolve, timer })
    try {
      const bc = new BroadcastChannel('guest-sync-channel')
      bc.postMessage({
        type: 'RELAY_FILE_OUTGOING',
        paths,
        source: options.source,
        correlationId
      })
      bc.close()
    } catch {
      clearTimeout(timer)
      relayPending.delete(correlationId)
      resolve(null)
    }
  })
}

export async function startOutgoingFileTransfer(
  paths: string[],
  source: FileSource
): Promise<void> {
  await requestOutgoingFileTransferFromPaths(paths, {
    source,
    useClipboardPolicy: source === 'clipboard'
  })
}

async function handleIncomingOffer(payload: {
  transferId: string
  source: FileSource
  files: { name: string; size: number }[]
}): Promise<void> {
  const hid = useHidChannel()
  if (!hid.isControlGranted.value) return
  if (activeReceive || activeSend) return

  const baseDir = await ensureDownloadDir()
  if (!baseDir || !window.api?.fileTransfer?.createEmptyFiles) {
    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({
        type: 'FILE_REJECT',
        payload: { transferId: payload.transferId, reason: 'no_download_dir' }
      })
    )
    return
  }

  const outputPaths: string[] = []
  const used = new Set<string>()
  for (const f of payload.files) {
    let name = sanitizeFileName(f.name)
    let candidate = `${baseDir.replace(/[/\\]$/, '')}${pathSep()}${name}`
    let n = 1
    while (used.has(candidate)) {
      const dot = name.lastIndexOf('.')
      const stem = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      name = sanitizeFileName(`${stem} (${n})${ext}`)
      candidate = `${baseDir.replace(/[/\\]$/, '')}${pathSep()}${name}`
      n++
    }
    used.add(candidate)
    outputPaths.push(candidate)
  }

  const ok = await window.api.fileTransfer.createEmptyFiles(outputPaths)
  if (!ok) {
    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({
        type: 'FILE_REJECT',
        payload: { transferId: payload.transferId, reason: 'create_failed' }
      })
    )
    return
  }

  await window.api.fileTransfer.registerReceive(payload.transferId, outputPaths)

  activeReceive = {
    transferId: payload.transferId,
    files: payload.files,
    outputPaths,
    currentFileIndex: 0,
    nextChunkIndex: 0,
    bytesInCurrentFile: 0
  }

  webRtcService.sendData(
    'file-transfer',
    JSON.stringify({
      type: 'FILE_ACCEPT',
      payload: { transferId: payload.transferId, files: payload.files }
    })
  )
}

function pathSep(): string {
  return typeof navigator !== 'undefined' && navigator.platform?.includes('Win') ? '\\' : '/'
}

async function runSenderAfterAccept(): Promise<void> {
  const send = activeSend
  const ch = webRtcService.fileTransferChannel
  if (!send || !ch || ch.readyState !== 'open') return

  const paths = send.files.map((f) => f.path)
  await window.api.fileTransfer.registerSendPaths(paths)

  try {
    let fileIndex = 0
    let chunkIndex = 0
    for (const file of send.files) {
      let offset = 0
      while (offset < file.size) {
        const len = Math.min(CHUNK_PAYLOAD, file.size - offset)
        const buf = await window.api.fileTransfer.readChunk(file.path, offset, len)
        if (!buf || buf.byteLength === 0) break
        const payload = new Uint8Array(buf)
        const frame = encodeFileChunkFrame(fileIndex, chunkIndex, payload)
        await waitBuffered(ch)
        webRtcService.sendData('file-transfer' as DataChannelLabel, frame)
        offset += buf.byteLength
        chunkIndex++
      }
      fileIndex++
      chunkIndex = 0
    }

    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({ type: 'FILE_COMPLETE', payload: { transferId: send.transferId } })
    )
  } finally {
    await window.api.fileTransfer.clearSendPaths(paths)
    activeSend = null
  }
}

function handleControlJson(obj: { type: string; payload: Record<string, unknown> }): void {
  const { type, payload } = obj
  if (type === 'FILE_OFFER') {
    const transferId = payload.transferId as string
    const source = (payload.source as FileSource) || 'manual'
    const files = payload.files as { name: string; size: number }[]
    if (!transferId || !Array.isArray(files) || !files.length) return
    void handleIncomingOffer({ transferId, source, files })
    return
  }

  if (type === 'FILE_ACCEPT') {
    const transferId = payload.transferId as string
    if (!activeSend || activeSend.transferId !== transferId) return
    void runSenderAfterAccept()
    return
  }

  if (type === 'FILE_COMPLETE') {
    const transferId = payload.transferId as string
    if (activeReceive?.transferId === transferId) {
      void window.api.fileTransfer.unregisterReceive(transferId)
      activeReceive = null
    }
    return
  }

  if (type === 'FILE_REJECT' || type === 'FILE_CANCEL') {
    const transferId = payload.transferId as string
    if (activeReceive?.transferId === transferId) {
      void window.api.fileTransfer.unregisterReceive(transferId)
      activeReceive = null
    }
    if (activeSend?.transferId === transferId) {
      void window.api.fileTransfer.clearSendPaths(activeSend.files.map((f) => f.path))
      activeSend = null
    }
  }
}

export function dispatchFileTransferControl(raw: string): void {
  try {
    const obj = JSON.parse(raw) as { type: string; payload: Record<string, unknown> }
    if (!obj?.type || !obj.payload) return
    handleControlJson(obj)
  } catch {
    // ignoruj nie-JSON
  }
}

export async function dispatchFileTransferBinary(buf: ArrayBuffer): Promise<void> {
  const recv = activeReceive
  if (!recv || !window.api?.fileTransfer?.appendChunk) return

  const decoded = decodeFileChunkFrame(buf)
  if (!decoded) return

  const { fileIndex, chunkIndex, payload } = decoded
  if (fileIndex !== recv.currentFileIndex) return
  if (chunkIndex !== recv.nextChunkIndex) return

  const meta = recv.files[fileIndex]
  if (!meta) return

  const copy = new Uint8Array(payload.byteLength)
  copy.set(payload)
  await window.api.fileTransfer.appendChunk(recv.transferId, fileIndex, copy.buffer)

  recv.bytesInCurrentFile += payload.byteLength
  recv.nextChunkIndex++

  if (recv.bytesInCurrentFile >= meta.size) {
    recv.currentFileIndex++
    recv.nextChunkIndex = 0
    recv.bytesInCurrentFile = 0
    if (recv.currentFileIndex >= recv.files.length) {
      void window.api.fileTransfer.unregisterReceive(recv.transferId)
      activeReceive = null
    }
  }
}

export async function setPreferredDownloadDirectory(): Promise<string | null> {
  const dir = await window.api?.fileTransfer?.pickDirectory?.()
  if (dir) {
    setDownloadDir(dir)
    return dir
  }
  return null
}

export async function startOutgoingChatFiles(
  filesWithPaths: { path: string; name: string; size: number }[]
): Promise<string | null> {
  const paths = filesWithPaths.map((f) => f.path)
  const meta = await requestOutgoingFileTransferFromPaths(paths, {
    source: 'chat',
    useClipboardPolicy: false
  })
  return meta?.transferId ?? null
}
