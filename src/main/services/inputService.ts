import { ipcMain, screen, BrowserWindow, app } from 'electron'
import { InputBridge, getCursorType, type InputEvent } from '@maciejwojs/input-bridge'
import { broadcastLockoutToWidget } from '../hostWidget'
import { MonitorMetadata } from '@maciejwojs/screen-capture'

const CLIPBOARD_TEXT_MAX_LENGTH = 262_144
const CLIPBOARD_FILES_MAX = 64
const CLIPBOARD_FILE_PATH_MAX = 4096

function normalizeClipboardFilePaths(data: unknown): string[] | null {
  if (!Array.isArray(data)) return null
  const out: string[] = []
  for (const item of data) {
    if (typeof item !== 'string' || item.length === 0) continue
    if (item.length > CLIPBOARD_FILE_PATH_MAX) continue
    out.push(item)
    if (out.length >= CLIPBOARD_FILES_MAX) break
  }
  return out.length > 0 ? out : null
}

/** Kolejność pod Windows (AltGr = ControlLeft + AltRight) — najpierw para AltGr, potem reszta modyfikatorów. */
const STUCK_MODIFIER_RELEASE_ORDER = [
  'AltRight',
  'ControlLeft',
  'AltLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight'
] as const

/* ================= TYPES & INTERFACES ================= */

type InputType = 'move' | 'click' | 'key'

interface QueuedInput {
  type: InputType
  payload: any
  timestamp: number
}

/* ================= LOCKOUT ================= */

class LockoutManager {
  private lockoutUntil = 0

  isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil
  }

  trigger(duration: number): void {
    this.lockoutUntil = Date.now() + duration
  }

  getUntil(): number {
    return this.lockoutUntil
  }
}

/* ================= INPUT CONTROLLER ================= */

class InputController {
  private bridge: InputBridge | null = null
  private isOptimizationEnabled = false

  /** Windows: pliki wysyłamy dopiero po Ctrl+V (getClipboardFiles), nie przy samym skopiowaniu. */
  private clipboardFilesSyncOnPasteOnly = false
  private physicalCtrlDown = false
  private physicalMetaDown = false

  private queue: QueuedInput[] = []
  private frameLoop: NodeJS.Timeout | null = null

  private targetScroll = 0
  private currentScroll = 0
  private isProcessingFrame = false

  async init(): Promise<void> {
    if (this.bridge) return

    const bridge = new InputBridge({ autoFlush: false })
    await bridge.init()
    bridge.onClipboard((event) => {
      if (event.type === 'text') {
        const text = typeof event.data === 'string' ? event.data : null
        if (text === null) return
        if (text.length > CLIPBOARD_TEXT_MAX_LENGTH) return
        inputService.broadcastClipboardText(text)
        return
      }
      if (event.type === 'files') {
        const paths = normalizeClipboardFilePaths(event.data)
        if (!paths) return
        if (this.clipboardFilesSyncOnPasteOnly) {
          return
        }
        inputService.broadcastClipboardFiles(paths)
      }
    })

    this.tryInitClipboardFilesPasteSync(bridge)

    bridge.setLogger((...args) => {
      console.log('[InputBridge-CPP]', ...args)
    })

    bridge.optimizeMouseMovesAbsolute(2)
    this.bridge = bridge

    this.startFrameLoop()
  }

  /**
   * Na Windows `startInputDetection` + `onInput` pozwala wykryć fizyczne Ctrl+V
   * i wtedy odczytać ścieżki przez `getClipboardFiles()` (synchro P2P dopiero tu).
   * Na Linuxie brak — zostaje natychmiastowa ścieżka z `onClipboard` (Ctrl+C).
   */
  private tryInitClipboardFilesPasteSync(bridge: InputBridge): void {
    try {
      const started =
        typeof bridge.startInputDetection === 'function' && bridge.startInputDetection()
      if (!started) return
      this.clipboardFilesSyncOnPasteOnly = true
      bridge.onInput((ev: InputEvent) => {
        this.handlePhysicalKeyForClipboardFiles(ev)
      })
    } catch (e) {
      console.warn(
        '[InputController] startInputDetection niedostępny — pliki schowka nadal przy zmianie schowka (Ctrl+C).',
        e
      )
      this.clipboardFilesSyncOnPasteOnly = false
    }
  }

  private handlePhysicalKeyForClipboardFiles(ev: InputEvent): void {
    if (ev.type !== 'key_press') return

    const down = ev.down !== false
    const dc = ev.domCode

    if (dc === 'ControlLeft' || dc === 'ControlRight') {
      this.physicalCtrlDown = down
      return
    }
    if (dc === 'MetaLeft' || dc === 'MetaRight') {
      this.physicalMetaDown = down
      return
    }

    if (!down) return
    if (!this.physicalCtrlDown && !this.physicalMetaDown) return

    const isV =
      dc === 'KeyV' ||
      (typeof ev.keyCode === 'number' && (ev.keyCode === 0x56 || ev.keyCode === 86))

    if (!isV) return

    const b = this.bridge
    if (!b || typeof b.getClipboardFiles !== 'function') return
    const raw = b.getClipboardFiles()
    const paths = normalizeClipboardFilePaths(raw)
    if (!paths) return
    inputService.broadcastClipboardFiles(paths)
  }

  setClipboardText(text: string): boolean {
    if (!this.bridge) return false
    return this.bridge.setClipboardText(text)
  }

  setClipboardFiles(filePaths: string[]): boolean {
    if (!this.bridge) return false
    return this.bridge.setClipboardFiles(filePaths)
  }

  getSessionHandle(): string | null {
    return this.bridge?.getPortalSessionHandle() || null
  }

  getRemotePipewireFd(): number | null {
    return this.bridge?.openPipeWireRemoteFd() || null
  }

  private startFrameLoop(): void {
    this.frameLoop = setInterval(() => {
      this.processFrame()
    }, 10)
  }

  private async processFrame(): Promise<void> {
    if (!this.bridge || this.isProcessingFrame) return
    this.isProcessingFrame = true

    try {
      let needsFlush = false

      const now = Date.now()
      const readyItems = this.queue.filter((item) => item.timestamp <= now)

      if (readyItems.length > 0) {
        this.queue = this.queue.filter((item) => item.timestamp > now)

        readyItems.sort((a, b) => a.timestamp - b.timestamp)

        for (const item of readyItems) {
          try {
            if (item.type === 'move') {
              const { x, y } = item.payload

              await this.bridge.moveMouseAbsolute(x, y)
              // await this.bridge.moveMouseRelative(x, y)

              // Mamy globalny offset z monitorIndex
              const monitors = this.bridge.getMonitors()
              const targetMonitor =
                monitors.find((m) => m.index === inputService.monitorIndex) ||
                monitors.find((m) => m.primary) ||
                monitors[0]

              if (targetMonitor) {
                inputService.tracker?.updateInjection(targetMonitor.x + x, targetMonitor.y + y)
              } else {
                inputService.tracker?.updateInjection(x, y)
              }
              needsFlush = true
            } else if (item.type === 'click') {
              await this.bridge.mouseClick(item.payload.btn, item.payload.down)
              this.bridge.flush()
              needsFlush = false
            } else if (item.type === 'key') {
              await this.bridge.keyPressDOM(item.payload.code, item.payload.down)
              this.bridge.flush()
              needsFlush = false
            }
          } catch (e) {
            console.error('[InputController] Zignorowano błąd polecenia z systemu:', e)
          }
        }
      }

      const scrollDiff = this.targetScroll - this.currentScroll
      if (Math.abs(scrollDiff) > 0.1) {
        const step = scrollDiff * 0.3
        this.currentScroll += step

        const roundedStep = Math.round(step)
        if (roundedStep !== 0) {
          if (this.bridge.scrollMouse) {
            await this.bridge.scrollMouse(roundedStep)
            needsFlush = true
          }
        }
      } else {
        this.currentScroll = this.targetScroll
      }

      if (needsFlush) {
        this.bridge.flush()
      }
    } finally {
      this.isProcessingFrame = false
    }
  }

  stop(): void {
    if (this.frameLoop) {
      clearInterval(this.frameLoop)
      this.frameLoop = null
    }
    if (this.bridge && this.clipboardFilesSyncOnPasteOnly) {
      try {
        this.bridge.stopInputDetection()
      } catch {
        // ignore
      }
      this.clipboardFilesSyncOnPasteOnly = false
    }
  }

  // --- API ---
  async move(targetX: number, targetY: number): Promise<void> {
    this.queue.push({
      type: 'move',
      payload: { x: targetX, y: targetY },
      timestamp: Date.now()
    })
  }

  async click(button: number): Promise<void> {
    const now = Date.now()
    this.queue.push({ type: 'click', payload: { btn: button, down: true }, timestamp: now })
    this.queue.push({ type: 'click', payload: { btn: button, down: false }, timestamp: now + 30 })
  }

  async doubleClick(button: number): Promise<void> {
    const now = Date.now()
    this.queue.push({ type: 'click', payload: { btn: button, down: true }, timestamp: now })
    this.queue.push({ type: 'click', payload: { btn: button, down: false }, timestamp: now + 30 })
    this.queue.push({ type: 'click', payload: { btn: button, down: true }, timestamp: now + 60 })
    this.queue.push({ type: 'click', payload: { btn: button, down: false }, timestamp: now + 90 })
  }

  async mouseDown(button: number): Promise<void> {
    this.queue.push({ type: 'click', payload: { btn: button, down: true }, timestamp: Date.now() })
  }

  async mouseUp(button: number): Promise<void> {
    this.queue.push({ type: 'click', payload: { btn: button, down: false }, timestamp: Date.now() })
  }

  async scrollMouse(deltaY: number): Promise<void> {
    this.targetScroll += deltaY
  }

  async key(domCode: string, action: 'd' | 'u'): Promise<void> {
    this.queue.push({
      type: 'key',
      payload: { code: domCode, down: action === 'd' },
      timestamp: Date.now()
    })
  }

  /** Zwalnia typowe modyfikatory po utracie sesji / „zaciętych” keydown bez keyup (np. Alt+strzałki). */
  releaseStuckModifierKeys(): void {
    const base = Date.now()
    STUCK_MODIFIER_RELEASE_ORDER.forEach((code, i) => {
      this.queue.push({
        type: 'key',
        payload: { code, down: false },
        timestamp: base + i * 3
      })
    })
  }

  setCurrentMonitor(index: number, width: number, height: number): boolean {
    if (!this.bridge) return false
    return this.bridge.setCurrentMonitor(index, width, height)
  }

  setMonitors(monitors: MonitorMetadata[]): void {
    if (!this.bridge) return
    this.bridge.setMonitors(monitors)
  }

  getMonitors() {
    if (!this.bridge) return []
    return this.bridge.getMonitors().map((m) => ({
      id: m.id,
      name: m.name,
      index: m.index,
      x: m.x,
      y: m.y,
      width: m.width,
      height: m.height,
      pipewireStream: Number(m.id)
    }))
  }

  toggleOptimization(): boolean {
    if (!this.bridge) return false
    this.isOptimizationEnabled = this.bridge.toggleOptimization()
    return this.isOptimizationEnabled
  }

  getOptimizationStatus(): boolean {
    return this.isOptimizationEnabled
  }
}

/* ================= HOST TRACKER ================= */

class HostActivityTracker {
  private interval: NodeJS.Timeout | null = null
  private lastX = -1
  private lastY = -1
  private lastInjectedAt = 0
  private isCurrentlyLockedOut = false

  constructor(
    private lockout: LockoutManager,
    private emit: (payload: { active: boolean; until: number }) => void
  ) {}

  start(): void {
    if (this.interval) return

    this.interval = setInterval(() => {
      const point = screen.getCursorScreenPoint()
      const now = Date.now()

      if (now - this.lastInjectedAt < 200) {
        this.lastX = point.x
        this.lastY = point.y
        return
      }

      if (this.lastX < 0) {
        this.lastX = point.x
        this.lastY = point.y
        return
      }

      const dx = Math.abs(point.x - this.lastX)
      const dy = Math.abs(point.y - this.lastY)

      if (dx > 2 || dy > 2) {
        this.lockout.trigger(3000)
        this.lastX = point.x
        this.lastY = point.y

        if (!this.isCurrentlyLockedOut) {
          this.isCurrentlyLockedOut = true
          this.emit({ active: true, until: this.lockout.getUntil() })
        }
      } else if (this.isCurrentlyLockedOut && !this.lockout.isLockedOut()) {
        this.isCurrentlyLockedOut = false
        this.emit({ active: false, until: 0 })
      }
    }, 50)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  updateInjection(x: number, y: number): void {
    this.lastX = x
    this.lastY = y
    this.lastInjectedAt = Date.now()
  }
}

/* ================= INPUT SERVICE ================= */

export const inputService = {
  controller: new InputController(),
  lockout: new LockoutManager(),
  tracker: null as HostActivityTracker | null,
  mainWindow: null as BrowserWindow | null,
  handlersRegistered: false,
  monitorIndex: 0,
  startingX: 0,

  cursorRelayInterval: null as NodeJS.Timeout | null,
  lastRelayedCursorType: '',

  async init(mainWindow: BrowserWindow): Promise<void> {
    this.mainWindow = mainWindow
    await this.controller.init()

    const emit = (payload: { active: boolean; until: number }): void => {
      this.mainWindow?.webContents.send('input:host-lockout', payload)
      broadcastLockoutToWidget(payload)
    }

    this.tracker = new HostActivityTracker(this.lockout, emit)
    this.tracker.start()

    this.registerHandlers()

    app.on('before-quit', () => {
      this.tracker?.stop()
      this.controller.stop()
      this.stopCursorP2PRelay()
    })
  },

  startCursorP2PRelay(): void {
    if (this.cursorRelayInterval) return

    this.lastRelayedCursorType = ''
    this.cursorRelayInterval = setInterval(() => {
      const cursorType = getCursorType()
      if (cursorType === this.lastRelayedCursorType) return

      this.lastRelayedCursorType = cursorType
      this.mainWindow?.webContents.send('input:host-cursor-sync', { cursorType })
    }, 150)
  },

  stopCursorP2PRelay(): void {
    if (!this.cursorRelayInterval) return
    clearInterval(this.cursorRelayInterval)
    this.cursorRelayInterval = null
    this.lastRelayedCursorType = ''
  },

  broadcastClipboardText(text: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue
      win.webContents.send('clipboard:bridge-text-change', { text })
    }
  },

  broadcastClipboardFiles(paths: string[]): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue
      win.webContents.send('clipboard:bridge-files-change', { paths })
    }
  },

  setStartingX(x: number): void {
    this.startingX = x
  },

  registerHandlers(): void {
    if (this.handlersRegistered) return
    this.handlersRegistered = true

    const isLocked = (): boolean => this.lockout.isLockedOut()

    ipcMain.handle('input:get-host-screen-size', async () => {
      const monitors = this.controller.getMonitors()
      const targetMonitor =
        monitors.find((m) => m.index === this.monitorIndex) ||
        // monitors.find((m) => m.primary) ||
        monitors[0]

      let display = screen.getPrimaryDisplay()
      if (targetMonitor) {
        const foundDisplay = screen
          .getAllDisplays()
          .find(
            (d) =>
              Math.abs(d.bounds.x - targetMonitor.x) < 5 &&
              Math.abs(d.bounds.y - targetMonitor.y) < 5
          )
        if (foundDisplay) display = foundDisplay
      }

      const logicalWidth = display.size.width
      const logicalHeight = display.size.height
      const scaleFactor = display.scaleFactor

      const physicalWidth = Math.round(logicalWidth * scaleFactor)
      const physicalHeight = Math.round(logicalHeight * scaleFactor)

      return {
        width: physicalWidth,
        height: physicalHeight,
        logicalWidth,
        logicalHeight,
        scaleFactor
      }
    })

    ipcMain.handle('input:move-absolute', async (_e, x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || isLocked()) return
      console.log(
        `[input:move-absolute] Monitor idx: ${this.monitorIndex}, received x=${x} y=${y} (raw, before round)`
      )
      const newX = this.startingX + x
      console.log(
        `[input:move-absolute] Monitor idx: ${this.monitorIndex}, received x=${newX} y=${y} (raw, after calculation)`
      )
      await this.controller.move(Math.round(newX), Math.round(y))
    })

    ipcMain.handle(
      'input:mouse-action',
      async (_e, btn: 'l' | 'm' | 'r', act: 'c' | 'dc' | 'd' | 'u', x: number, y: number) => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || isLocked()) return

        const map: Record<string, number> = { l: 0, m: 2, r: 1 }
        if (typeof map[btn] !== 'number') return

        await this.controller.move(Math.round(x), Math.round(y))

        if (act === 'c') await this.controller.click(map[btn])
        else if (act === 'dc') await this.controller.doubleClick(map[btn])
        else if (act === 'd') await this.controller.mouseDown(map[btn])
        else if (act === 'u') await this.controller.mouseUp(map[btn])
      }
    )

    ipcMain.handle('input:keyboard-event', async (_e, domCode: string, action: 'd' | 'u') => {
      if (action !== 'u' && isLocked()) return
      await this.controller.key(domCode, action)
    })

    ipcMain.handle('input:keyboard-release-stuck-modifiers', () => {
      this.controller.releaseStuckModifierKeys()
    })

    ipcMain.handle('input:toggle-optimization', () => {
      return this.controller.toggleOptimization()
    })

    ipcMain.handle('input:get-optimization-status', () => {
      return this.controller.getOptimizationStatus()
    })

    ipcMain.handle('input:scroll-mouse', async (_e, deltaY: number) => {
      if (!Number.isFinite(deltaY) || isLocked()) return
      await this.controller.scrollMouse(deltaY)
    })

    ipcMain.handle('input:get-cursor-type', () => {
      try {
        return getCursorType()
      } catch (e) {
        console.warn('[InputService] Nie udało się odczytać kursora:', e)
        return 'default'
      }
    })

    ipcMain.handle('input:cursor-p2p-relay-start', () => {
      this.startCursorP2PRelay()
    })

    ipcMain.handle('input:cursor-p2p-relay-stop', () => {
      this.stopCursorP2PRelay()
    })

    ipcMain.handle('clipboard:set-text-from-sync', (_e, text: unknown) => {
      if (typeof text !== 'string') return false
      if (text.length > CLIPBOARD_TEXT_MAX_LENGTH) return false
      return this.controller.setClipboardText(text)
    })

    ipcMain.handle('clipboard:set-files-from-sync', (_e, paths: unknown) => {
      const normalized = normalizeClipboardFilePaths(paths)
      if (!normalized) return false
      return this.controller.setClipboardFiles(normalized)
    })
  }
}
