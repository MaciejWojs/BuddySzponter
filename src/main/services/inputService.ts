import { ipcMain, screen, BrowserWindow, app } from 'electron'
import { InputBridge } from '@maciejwojs/input-bridge'
import { broadcastLockoutToWidget } from '../hostWidget'

/* ================= TYPES & INTERFACES ================= */

type InputType = 'move' | 'click' | 'key'

interface QueuedInput {
  type: InputType
  priority: number
  payload: any /// TODO: make this more specific per type
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

  private queue: QueuedInput[] = []
  private frameLoop: NodeJS.Timeout | null = null

  private targetScroll = 0
  private currentScroll = 0

  async init(): Promise<void> {
    if (this.bridge) return

    const bridge = new InputBridge({ autoFlush: false })
    await bridge.init()

    // this.isOptimizationEnabled = bridge.toggleOptimization()
    bridge.optimizeMouseMovesAbsolute(2)
    this.bridge = bridge

    this.startFrameLoop()
  }

  private isProcessingFrame = false

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

      if (this.queue.length > 0) {
        this.queue.sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp)

        const lastMove = [...this.queue].reverse().find((i) => i.type === 'move')
        const filteredQueue = this.queue.filter((i) => i.type !== 'move' || i === lastMove)

        for (const item of filteredQueue) {
          if (item.type === 'move') {
            const { x, y } = item.payload
            await this.bridge.moveMouseAbsolute(x, y)
            needsFlush = true
          } else if (item.type === 'click') {
            await this.bridge.mouseClick(item.payload.btn, item.payload.down)
            needsFlush = true
          } else if (item.type === 'key') {
            await this.bridge.keyPressDOM(item.payload.code, item.payload.down)
            needsFlush = true
          }
        }

        this.queue = []
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
  }

  // --- API ---

  async move(targetX: number, targetY: number): Promise<void> {
    this.queue.push({
      type: 'move',
      priority: 1,
      payload: { x: targetX, y: targetY },
      timestamp: Date.now()
    })
  }

  async click(button: number): Promise<void> {
    const now = Date.now()
    this.queue.push({
      type: 'click',
      priority: 0,
      payload: { btn: button, down: true },
      timestamp: now
    })
    this.queue.push({
      type: 'click',
      priority: 0,
      payload: { btn: button, down: false },
      timestamp: now + 1
    })
  }

  async doubleClick(button: number): Promise<void> {
    await this.click(button)
    await this.click(button)
  }

  async mouseDown(button: number): Promise<void> {
    this.queue.push({
      type: 'click',
      priority: 0,
      payload: { btn: button, down: true },
      timestamp: Date.now()
    })
  }

  async mouseUp(button: number): Promise<void> {
    this.queue.push({
      type: 'click',
      priority: 0,
      payload: { btn: button, down: false },
      timestamp: Date.now()
    })
  }

  async scrollMouse(deltaY: number): Promise<void> {
    this.targetScroll += deltaY
  }

  async key(domCode: string, action: 'd' | 'u'): Promise<void> {
    this.queue.push({
      type: 'key',
      priority: 0,
      payload: { code: domCode, down: action === 'd' },
      timestamp: Date.now()
    })
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
          this.emit({
            active: true,
            until: this.lockout.getUntil()
          })
        }
      } else if (this.isCurrentlyLockedOut && !this.lockout.isLockedOut()) {
        this.isCurrentlyLockedOut = false
        this.emit({
          active: false,
          until: 0
        })
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
    })
  },

  registerHandlers(): void {
    if (this.handlersRegistered) return
    this.handlersRegistered = true

    const isLocked = (): boolean => this.lockout.isLockedOut()

    ipcMain.handle('input:get-host-screen-size', async () => {
      const display = screen.getPrimaryDisplay()

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

      const tx = Math.round(x)
      const ty = Math.round(y)

      await this.controller.move(tx, ty)
      this.tracker?.updateInjection(tx, ty)
    })

    ipcMain.handle(
      'input:mouse-action',
      async (_e, btn: 'l' | 'm' | 'r', act: 'c' | 'dc' | 'd' | 'u', x: number, y: number) => {
        if (isLocked()) return

        const map: Record<string, number> = { l: 0, m: 2, r: 1 }
        if (typeof map[btn] !== 'number') return

        const tx = Math.round(x)
        const ty = Math.round(y)

        await this.controller.move(tx, ty)

        if (act === 'c') await this.controller.click(map[btn])
        else if (act === 'dc') await this.controller.doubleClick(map[btn])
        else if (act === 'd') await this.controller.mouseDown(map[btn])
        else if (act === 'u') await this.controller.mouseUp(map[btn])

        this.tracker?.updateInjection(tx, ty)
      }
    )

    ipcMain.handle('input:keyboard-event', async (_e, domCode: string, action: 'd' | 'u') => {
      if (isLocked()) return
      await this.controller.key(domCode, action)
    })

    ipcMain.handle('input:toggle-optimization', () => {
      return this.controller.toggleOptimization()
    })

    ipcMain.handle('input:get-optimization-status', () => {
      return this.controller.getOptimizationStatus()
    })

    ipcMain.handle('input:scroll-mouse', async (_e, deltaY: number) => {
      if (isLocked()) return
      await this.controller.scrollMouse(deltaY)
    })
  }
}
