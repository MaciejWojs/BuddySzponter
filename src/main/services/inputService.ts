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
    bridge.optimizeMouseMovesAbsolute(2)

    this.bridge = bridge
  }

  private async ensure(): Promise<InputBridge> {
    if (!this.bridge) await this.init()
    return this.bridge!
  }

  async move(x: number, y: number): Promise<void> {
    const bridge = await this.ensure()
    bridge.moveMouseAbsolute(x, y)
    bridge.flush()
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

  async key(domCode: string, action: string): Promise<void> {
    const bridge = await this.ensure()
    bridge.keyPressDOM(domCode, action === 'down')
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

        this.emit({
          active: true,
          until: this.lockout.getUntil()
        })
      } else if (!this.lockout.isLockedOut()) {
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
      const { width, height } = screen.getPrimaryDisplay().size
      return { width, height }
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
      async (_e, button: string, action: string, x: number, y: number) => {
        if (isLocked()) return

        const map: Record<string, number> = {
          left: 0,
          right: 1,
          middle: 2
        }

        if (!map[button]) return

        const tx = Math.round(x)
        const ty = Math.round(y)

        await this.controller.move(tx, ty)

        if (action === 'click') {
          await this.controller.click(map[button])
        } else if (action === 'double') {
          await this.controller.doubleClick(map[button])
        }

        this.tracker?.updateInjection(tx, ty)
      }
    )

    ipcMain.handle('input:keyboard-event', async (_e, domCode: string, action: string) => {
      if (isLocked()) return
      await this.controller.key(domCode, action)
    })

    ipcMain.handle('input:toggle-optimization', () => {
      return this.controller.toggleOptimization()
    })

    ipcMain.handle('input:get-optimization-status', () => {
      return this.controller.getOptimizationStatus()
    })
  }
}
