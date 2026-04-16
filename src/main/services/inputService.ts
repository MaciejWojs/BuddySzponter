// src/main/services/inputService.ts
import { ipcMain, screen, BrowserWindow } from 'electron'
import { InputBridge } from '@maciejwojs/input-bridge'
import { broadcastLockoutToWidget } from '../hostWidget'

let bridge: InputBridge | null = null
let isOptimizationEnabled = false
let handlersRegistered = false

let hostLockoutUntil = 0
let lastInjectedX = -1
let lastInjectedY = -1
let hostTrackerInterval: ReturnType<typeof setInterval> | null = null

// NOWE: Śledzenie zmiany stanu
let isCurrentlyLockedOut = false
let mainWindowRef: BrowserWindow | null = null

const ensureBridgeReady = async (): Promise<InputBridge> => {
  if (bridge) return bridge
  const nextBridge = new InputBridge({ autoFlush: false })
  await nextBridge.init()
  isOptimizationEnabled = nextBridge.toggleOptimization()
  nextBridge.optimizeMouseMovesAbsolute(2)
  bridge = nextBridge
  return nextBridge
}

const startHostTracker = (): void => {
  if (hostTrackerInterval) return

  hostTrackerInterval = setInterval(() => {
    const point = screen.getCursorScreenPoint()
    const now = Date.now()

    if (lastInjectedX < 0 || lastInjectedY < 0) {
      lastInjectedX = point.x
      lastInjectedY = point.y
      return
    }

    const deltaX = Math.abs(point.x - lastInjectedX)
    const deltaY = Math.abs(point.y - lastInjectedY)

    if (deltaX > 2 || deltaY > 2) {
      hostLockoutUntil = now + 3000
      lastInjectedX = point.x
      lastInjectedY = point.y

      if (!isCurrentlyLockedOut) {
        isCurrentlyLockedOut = true
        mainWindowRef?.webContents.send('input:host-lockout', true)
        broadcastLockoutToWidget(true)
      }
    } else if (isCurrentlyLockedOut && now >= hostLockoutUntil) {
      isCurrentlyLockedOut = false
      mainWindowRef?.webContents.send('input:host-lockout', false)
      broadcastLockoutToWidget(false)
    }
  }, 50)
}

export const inputService = {
  async init(mainWindow: BrowserWindow) {
    mainWindowRef = mainWindow
    await ensureBridgeReady()
    startHostTracker()
    this.registerHandlers()
  },

  registerHandlers() {
    if (handlersRegistered) return
    handlersRegistered = true

    ipcMain.handle('input:move-absolute', async (_event, x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      if (Date.now() < hostLockoutUntil) return

      const targetX = Math.round(x)
      const targetY = Math.round(y)

      const readyBridge = await ensureBridgeReady()
      readyBridge.moveMouseAbsolute(targetX, targetY)
      readyBridge.flush()

      lastInjectedX = targetX
      lastInjectedY = targetY
    })

    ipcMain.handle('input:toggle-optimization', async () => {
      const readyBridge = await ensureBridgeReady()

      isOptimizationEnabled = readyBridge.toggleOptimization()

      return isOptimizationEnabled
    })

    ipcMain.handle('input:get-optimization-status', () => {
      return isOptimizationEnabled
    })
  }
}
