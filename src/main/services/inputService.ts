import { ipcMain, screen, BrowserWindow, app } from 'electron'
import { InputBridge } from '@maciejwojs/input-bridge'
import { broadcastLockoutToWidget } from '../hostWidget'

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

  async init(): Promise<void> {
    if (this.bridge) return

    const bridge = new InputBridge({ autoFlush: false })
    await bridge.init()

    this.isOptimizationEnabled = bridge.toggleOptimization()
    // bridge.optimizeMouseMovesAbsolute(2)

    this.bridge = bridge
  }

  private async ensure(): Promise<InputBridge> {
    if (!this.bridge) await this.init()
    return this.bridge!
  }

  async move(targetX: number, targetY: number): Promise<void> {
    const bridge = await this.ensure()

    const currentPos = screen.getCursorScreenPoint()

    const dx = targetX - currentPos.x
    const dy = targetY - currentPos.y

    if (dx !== 0 || dy !== 0) {
      bridge.moveMouseRelative(dx, dy)
      bridge.flush()
    }
  }

  async click(button: number): Promise<void> {
    const bridge = await this.ensure()
    bridge.mouseClick(button, true)
    bridge.mouseClick(button, false)
    bridge.flush()
  }

  async doubleClick(button: number): Promise<void> {
    const bridge = await this.ensure()
    for (let i = 0; i < 2; i++) {
      bridge.mouseClick(button, true)
      bridge.mouseClick(button, false)
    }
    bridge.flush()
  }

  async mouseDown(button: number): Promise<void> {
    const bridge = await this.ensure()
    bridge.mouseClick(button, true)
    bridge.flush()
  }

  async mouseUp(button: number): Promise<void> {
    const bridge = await this.ensure()
    bridge.mouseClick(button, false)
    bridge.flush()
  }

  async scrollMouse(deltaY: number): Promise<void> {
    const bridge = await this.ensure()

    if (!bridge.scrollMouse) {
      console.warn('scrollMouse not supported')
      return
    }

    bridge.scrollMouse(deltaY)
    bridge.flush()
  }

  async key(domCode: string, action: 'd' | 'u'): Promise<void> {
    const bridge = await this.ensure()
    bridge.keyPressDOM(domCode, action === 'd')
    bridge.flush()
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
      const scaleFactor = display.scaleFactor // Np. 1.0 (100%), 1.25 (125%), 1.5 (150%)

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

        const map: Record<string, number> = {
          l: 0,
          m: 2,
          r: 1
        }

        if (typeof map[btn] !== 'number') return

        const tx = Math.round(x)
        const ty = Math.round(y)

        await this.controller.move(tx, ty)

        if (act === 'c') {
          await this.controller.click(map[btn])
        } else if (act === 'dc') {
          await this.controller.doubleClick(map[btn])
        } else if (act === 'd') {
          await this.controller.mouseDown(map[btn])
        } else if (act === 'u') {
          await this.controller.mouseUp(map[btn])
        }

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

      console.log('[inputService] scroll:', deltaY)

      await this.controller.scrollMouse(deltaY)
    })
  }
}
