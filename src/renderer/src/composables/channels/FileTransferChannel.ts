import {
  webRtcService,
  type DataChannelLabel
} from '@renderer/composables/connection/webRTCService'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import {
  decodeFileChunkFrame,
  encodeFileChunkFrame
} from '@renderer/composables/fileTransfer/binaryFrame'
import { isGuestWindow } from '@renderer/utils/windowRole'

const LOG = '[ClipboardP2P]'

const CHUNK_PAYLOAD = 32 * 1024
const BUFFERED_HIGH_WATER = 2 * 1024 * 1024
const DOWNLOAD_DIR_KEY = 'fileTransferDownloadDir'

type FileSource = 'clipboard' | 'chat' | 'manual'

type ActiveReceive = {
  transferId: string
  source: FileSource
  files: { name: string; size: number }[]
  outputPaths: string[]
  currentFileIndex: number
  nextChunkIndex: number
  bytesInCurrentFile: number
  /**
   * Clipboard source na Windows przez `setSyncFilesRemote` (COM IDataObject) bywa nietrwałe
   * (często "działa tylko raz"). Dla stabilności wymuszamy zapis na dysk → `setSyncFiles` (CF_HDROP).
   */
  clipboardStorage?: 'remote' | 'disk'
  /** Składowanie chunków bieżącego pliku (tylko source === 'clipboard'). */
  clipboardCurrentChunks?: Uint8Array[]
  /** Ukończone pliki przed `setSyncFilesRemote` (tylko clipboard). */
  clipboardDoneFiles?: { fileName: string; data: Uint8Array }[]
}

function normalizePathsFingerprint(paths: string[]): string {
  return JSON.stringify([...paths].map((p) => p.replace(/\\/g, '/').toLowerCase()).sort())
}

let lastReceiveClipboardPublishFingerprint = ''
let lastReceiveClipboardPublishAt = 0

function markPathsAsJustPublishedToClipboard(paths: string[]): void {
  lastReceiveClipboardPublishFingerprint = normalizePathsFingerprint(paths)
  lastReceiveClipboardPublishAt = Date.now()
}

/** Zapobiega ponownemu FILE_OFFER po programowym ustawieniu schowka po odbiorze plików ze schowka. */
export function shouldIgnoreOutgoingClipboardPaths(paths: string[]): boolean {
  if (!paths.length || !lastReceiveClipboardPublishFingerprint) return false
  if (Date.now() - lastReceiveClipboardPublishAt > 8000) return false
  return normalizePathsFingerprint(paths) === lastReceiveClipboardPublishFingerprint
}

/** Po `setClipboardFilesRemote` most emituje nowe ścieżki — krótko ignoruj echo `onBridgeFiles`. */
let clipboardBridgeEchoMuteUntil = 0

export function beginClipboardBridgeEchoMute(ms = 5000): void {
  clipboardBridgeEchoMuteUntil = Date.now() + ms
  console.info(
    LOG,
    'echo mute until',
    new Date(clipboardBridgeEchoMuteUntil).toISOString(),
    `(${ms}ms)`
  )
}

export function shouldIgnoreClipboardBridgeFilesEcho(): boolean {
  return Date.now() < clipboardBridgeEchoMuteUntil
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

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const c of chunks) total += c.byteLength
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
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
  lastReceiveClipboardPublishFingerprint = ''
  lastReceiveClipboardPublishAt = 0
  clipboardBridgeEchoMuteUntil = 0
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
  if (!paths.length || activeSend) {
    console.info(LOG, 'beginOutgoingFromPaths skip', {
      reason: !paths.length ? 'empty_paths' : 'active_send',
      source,
      pathCount: paths.length
    })
    return null
  }
  if (!window.api?.fileTransfer?.registerSendPaths) {
    console.warn(LOG, 'beginOutgoingFromPaths: registerSendPaths missing')
    return null
  }

  await window.api.fileTransfer.registerSendPaths(paths)
  const stats = await window.api.fileTransfer.statFiles(paths)

  const ch = webRtcService.fileTransferChannel
  if (!stats.length || !ch || ch.readyState !== 'open') {
    console.warn(LOG, 'beginOutgoingFromPaths abort', {
      source,
      statCount: stats.length,
      dcReady: ch?.readyState,
      dcLabel: ch?.label
    })
    await window.api.fileTransfer.clearSendPaths?.(paths)
    return null
  }

  const transferId = crypto.randomUUID()
  activeSend = {
    transferId,
    files: stats.map((s) => ({ path: s.path, name: s.name, size: s.size })),
    source
  }

  console.info(LOG, 'FILE_OFFER sent', {
    transferId,
    source,
    files: stats.map((s) => ({ name: s.name, size: s.size }))
  })

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
  const needsControl = source === 'clipboard'
  if ((needsControl && !hid.isControlGranted.value) || !paths.length) {
    console.info(LOG, 'completeRelayOutgoing blocked', {
      needsControl,
      control: hid.isControlGranted.value,
      pathCount: paths.length
    })
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
    if (!hid.clipboardSyncEnabled.value || !hid.isControlGranted.value) {
      console.info(LOG, 'requestOutgoing blocked (clipboard policy)', {
        sync: hid.clipboardSyncEnabled.value,
        control: hid.isControlGranted.value
      })
      return null
    }
  }

  if (!paths.length || activeSend) {
    console.info(LOG, 'requestOutgoing skip', {
      reason: !paths.length ? 'no_paths' : 'active_send',
      source: options.source
    })
    return null
  }

  const ch = webRtcService.fileTransferChannel
  if (ch?.readyState === 'open') {
    return beginOutgoingFromPaths(paths, options.source)
  }

  console.info(LOG, 'requestOutgoing: DC not open, trying relay or abort', {
    source: options.source,
    dcReady: ch?.readyState,
    isGuestHash: isGuestWindow()
  })

  if (isGuestWindow()) {
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
  if (payload.source === 'clipboard' && !hid.isControlGranted.value) {
    console.warn(LOG, 'FILE_REJECT no_control', payload.transferId)
    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({
        type: 'FILE_REJECT',
        payload: { transferId: payload.transferId, reason: 'no_control' }
      })
    )
    return
  }
  if (activeReceive || activeSend) {
    console.warn(LOG, 'FILE_OFFER ignored (busy)', {
      transferId: payload.transferId,
      source: payload.source,
      hasReceive: Boolean(activeReceive),
      hasSend: Boolean(activeSend)
    })
    return
  }

  // Dla clipboard: odbiór chunków w RAM → setSyncFilesRemote (bez plików na dysku)
  if (payload.source === 'clipboard') {
    const useDiskClipboardOnWindows =
      typeof navigator !== 'undefined' && navigator.platform?.includes('Win')

    // On Windows omijamy `setSyncFilesRemote` (remote clipboard via IDataObject)
    // i idziemy w stabilny wariant CF_HDROP: zapis na dysk → `setSyncFiles`.
    if (!useDiskClipboardOnWindows) {
      activeReceive = {
        transferId: payload.transferId,
        source: payload.source,
        files: payload.files,
        outputPaths: [],
        currentFileIndex: 0,
        nextChunkIndex: 0,
        bytesInCurrentFile: 0,
        clipboardStorage: 'remote',
        clipboardCurrentChunks: [],
        clipboardDoneFiles: []
      }

      console.info(LOG, 'clipboard receive → FILE_ACCEPT', {
        transferId: payload.transferId,
        files: payload.files
      })

      webRtcService.sendData(
        'file-transfer',
        JSON.stringify({
          type: 'FILE_ACCEPT',
          payload: { transferId: payload.transferId, files: payload.files }
        })
      )
      return
    }

    // Dla Windows: dalej wykonujemy "disk branch" poniżej (zapis plików + `setSyncFiles`).
  }

  const baseDir = await ensureDownloadDir()
  if (!baseDir || !window.api?.fileTransfer?.createEmptyFiles) {
    console.warn(LOG, 'FILE_REJECT no_download_dir', payload.transferId)
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
    console.warn(LOG, 'FILE_REJECT create_failed', payload.transferId)
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
    source: payload.source,
    files: payload.files,
    outputPaths,
    currentFileIndex: 0,
    nextChunkIndex: 0,
    bytesInCurrentFile: 0,
    clipboardStorage: payload.source === 'clipboard' ? 'disk' : undefined
  }

  console.info(LOG, 'disk receive → FILE_ACCEPT', {
    transferId: payload.transferId,
    source: payload.source,
    outputPaths
  })

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
  if (!send || !ch || ch.readyState !== 'open') {
    console.warn(LOG, 'runSenderAfterAccept skip', {
      hasSend: Boolean(send),
      dcReady: ch?.readyState
    })
    return
  }

  console.info(LOG, 'runSenderAfterAccept start', {
    transferId: send.transferId,
    source: send.source,
    fileCount: send.files.length
  })

  const paths = send.files.map((f) => f.path)
  await window.api.fileTransfer.registerSendPaths(paths)

  try {
    let fileIndex = 0
    let chunkIndex = 0
    for (const file of send.files) {
      if (file.size === 0) {
        const frame = encodeFileChunkFrame(fileIndex, 0, new Uint8Array(0))
        await waitBuffered(ch)
        webRtcService.sendData('file-transfer' as DataChannelLabel, frame)
        fileIndex++
        chunkIndex = 0
        continue
      }
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
      if (offset !== file.size) {
        throw new Error(
          `readChunk nie dosłał całości (${offset}/${file.size} bajtów): ${file.path}`
        )
      }
      fileIndex++
      chunkIndex = 0
    }

    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({ type: 'FILE_COMPLETE', payload: { transferId: send.transferId } })
    )
    console.info(LOG, 'FILE_COMPLETE sent', send.transferId)
  } catch (e) {
    console.error(LOG, 'sender error', e)
    webRtcService.sendData(
      'file-transfer',
      JSON.stringify({
        type: 'FILE_CANCEL',
        payload: { transferId: send.transferId }
      })
    )
  } finally {
    await window.api.fileTransfer.clearSendPaths(paths)
    activeSend = null
    console.info(LOG, 'runSenderAfterAccept finished (activeSend cleared)')
  }
}

function handleControlJson(obj: { type: string; payload: Record<string, unknown> }): void {
  const { type, payload } = obj
  if (type === 'FILE_OFFER') {
    const transferId = payload.transferId as string
    const source = (payload.source as FileSource) || 'manual'
    const files = payload.files as { name: string; size: number }[]
    if (!transferId || !Array.isArray(files) || !files.length) {
      console.warn(LOG, 'FILE_OFFER invalid payload', payload)
      return
    }
    console.info(LOG, 'FILE_OFFER received', { transferId, source, fileCount: files.length })
    void handleIncomingOffer({ transferId, source, files })
    return
  }

  if (type === 'FILE_ACCEPT') {
    const transferId = payload.transferId as string
    if (!activeSend || activeSend.transferId !== transferId) {
      console.warn(LOG, 'FILE_ACCEPT ignored (no matching activeSend)', {
        transferId,
        expected: activeSend?.transferId ?? null,
        hasActiveSend: Boolean(activeSend)
      })
      return
    }
    console.info(LOG, 'FILE_ACCEPT → runSenderAfterAccept', transferId)
    void runSenderAfterAccept()
    return
  }

  if (type === 'FILE_COMPLETE') {
    const transferId = payload.transferId as string
    const recv = activeReceive
    if (recv?.transferId !== transferId) {
      console.info(LOG, 'FILE_COMPLETE ignored (no matching activeReceive)', {
        transferId,
        expected: recv?.transferId ?? null
      })
      return
    }

    if (recv.source === 'clipboard') {
      const cur = recv.files[recv.currentFileIndex]
      if (cur && recv.bytesInCurrentFile < cur.size) {
        console.warn(
          LOG,
          'FILE_COMPLETE (clipboard) przy niepełnym odbiorze — brak setSyncFilesRemote',
          {
            transferId,
            fileIndex: recv.currentFileIndex,
            bytesInCurrentFile: recv.bytesInCurrentFile,
            expectedSize: cur.size
          }
        )
      }
      console.info(LOG, 'FILE_COMPLETE (clipboard) — completion in binary path', transferId)
      return
    }

    if (recv.outputPaths?.length) {
      markPathsAsJustPublishedToClipboard(recv.outputPaths)
      void window.api?.clipboard?.setSyncFiles?.(recv.outputPaths)?.catch(() => undefined)
    }
    void window.api.fileTransfer.unregisterReceive(transferId)
    activeReceive = null
    return
  }

  if (type === 'FILE_REJECT' || type === 'FILE_CANCEL') {
    const transferId = payload.transferId as string
    console.info(LOG, type, { transferId, reason: payload.reason })
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
    if (!obj?.type || !obj.payload) {
      console.warn(LOG, 'control JSON missing type/payload', raw.slice(0, 200))
      return
    }
    handleControlJson(obj)
  } catch (e) {
    console.warn(LOG, 'control JSON parse error', e, raw.slice(0, 120))
  }
}

export async function dispatchFileTransferBinary(buf: ArrayBuffer): Promise<void> {
  const recv = activeReceive
  if (!recv) {
    console.warn(LOG, 'binary chunk dropped: no activeReceive', { byteLength: buf.byteLength })
    return
  }

  const decoded = decodeFileChunkFrame(buf)
  if (!decoded) {
    console.warn(LOG, 'binary chunk decode failed', { byteLength: buf.byteLength })
    return
  }

  const { fileIndex, chunkIndex, payload } = decoded
  if (fileIndex !== recv.currentFileIndex) {
    console.warn(LOG, 'binary chunk wrong fileIndex', {
      expected: recv.currentFileIndex,
      got: fileIndex,
      chunkIndex,
      transferId: recv.transferId,
      source: recv.source
    })
    return
  }
  if (chunkIndex !== recv.nextChunkIndex) {
    console.warn(LOG, 'binary chunk wrong chunkIndex', {
      expected: recv.nextChunkIndex,
      got: chunkIndex,
      fileIndex,
      transferId: recv.transferId,
      source: recv.source
    })
    return
  }

  const meta = recv.files[fileIndex]
  if (!meta) {
    console.warn(LOG, 'binary chunk: no meta for fileIndex', fileIndex)
    return
  }

  if (recv.source === 'clipboard' && recv.clipboardStorage !== 'disk') {
    if (!recv.clipboardCurrentChunks) recv.clipboardCurrentChunks = []
    if (!recv.clipboardDoneFiles) recv.clipboardDoneFiles = []

    recv.clipboardCurrentChunks.push(new Uint8Array(payload))
    recv.bytesInCurrentFile += payload.byteLength
    recv.nextChunkIndex++

    if (recv.bytesInCurrentFile < meta.size) {
      return
    }

    const fileBytes = concatUint8Arrays(recv.clipboardCurrentChunks)
    recv.clipboardDoneFiles.push({ fileName: meta.name, data: fileBytes })
    recv.clipboardCurrentChunks = []
    recv.currentFileIndex++
    recv.nextChunkIndex = 0
    recv.bytesInCurrentFile = 0

    if (recv.currentFileIndex < recv.files.length) {
      return
    }

    const transferId = recv.transferId
    const done = recv.clipboardDoneFiles
    beginClipboardBridgeEchoMute(5000)
    try {
      if (window.api?.clipboard?.setSyncFilesRemote) {
        const ok = await window.api.clipboard.setSyncFilesRemote(
          done.map((f) => ({ fileName: f.fileName, data: f.data }))
        )
        console.info(LOG, 'setSyncFilesRemote result', {
          ok,
          fileCount: done.length,
          sizes: done.map((f) => ({ name: f.fileName, bytes: f.data.byteLength }))
        })
        if (!ok) {
          console.warn(LOG, 'setSyncFilesRemote returned false')
        }
      } else {
        console.warn(LOG, 'setSyncFilesRemote missing on window.api.clipboard')
      }
    } catch (e) {
      console.error(LOG, 'setSyncFilesRemote error', e)
    }
    void window.api.fileTransfer.unregisterReceive(transferId)
    activeReceive = null
    console.info(LOG, 'clipboard receive complete, activeReceive cleared', transferId)
    return
  }

  if (!window.api?.fileTransfer?.appendChunk) {
    console.warn(LOG, 'appendChunk API missing')
    return
  }

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
      const pathsForClipboard =
        recv.outputPaths && recv.outputPaths.length > 0 ? recv.outputPaths : null
      void window.api.fileTransfer.unregisterReceive(recv.transferId)
      activeReceive = null
      if (pathsForClipboard?.length) {
        markPathsAsJustPublishedToClipboard(pathsForClipboard)
        void window.api?.clipboard?.setSyncFiles?.(pathsForClipboard)?.catch(() => undefined)
      }
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
