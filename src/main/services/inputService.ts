import { ipcMain, screen, BrowserWindow } from 'electron'
import { InputBridge } from '@maciejwojs/input-bridge'
import { broadcastLockoutToWidget } from '../hostWidget'

let bridge: InputBridge | null = null
let isOptimizationEnabled = false
let handlersRegistered = false

let hostLockoutUntil = 0
let lastInjectedX = -1
let lastInjectedY = -1
let lastInjectedAt = 0 // Czas ostatniej iniekcji
let hostTrackerInterval: ReturnType<typeof setInterval> | null = null

let isCurrentlyLockedOut = false
let mainWindowRef: BrowserWindow | null = null

// Konfiguracja
const GRACE_PERIOD_MS = 200 // Ignoruj ruchy systemowe przez 200ms po iniekcji
const LOCKOUT_DURATION_MS = 3000 // Blokada na 3 sekundy po wykryciu ruchu hosta
const MOVEMENT_THRESHOLD = 3 // Czułość (piksele)

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

    // 1. Jeśli jesteśmy w okresie "Grace Period" po iniekcji gościa,
    // aktualizujemy tylko pozycję bazową i nic nie sprawdzamy.
    if (now - lastInjectedAt < GRACE_PERIOD_MS) {
      lastInjectedX = point.x
      lastInjectedY = point.y
      return
    }

    if (lastInjectedX < 0 || lastInjectedY < 0) {
      lastInjectedX = point.x
      lastInjectedY = point.y
      return
    }

    const deltaX = Math.abs(point.x - lastInjectedX)
    const deltaY = Math.abs(point.y - lastInjectedY)

    // 2. Wykrywanie ruchu fizycznego Hosta
    if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
      hostLockoutUntil = now + LOCKOUT_DURATION_MS
      lastInjectedX = point.x
      lastInjectedY = point.y

      if (!isCurrentlyLockedOut) {
        isCurrentlyLockedOut = true
        mainWindowRef?.webContents.send('input:host-lockout', true)
        broadcastLockoutToWidget(true)
        console.log('[InputService] Host moved mouse - Lockout engaged')
      }
    }
    // 3. Zdejmowanie blokady po czasie bezczynności
    else if (isCurrentlyLockedOut && now >= hostLockoutUntil) {
      isCurrentlyLockedOut = false
      mainWindowRef?.webContents.send('input:host-lockout', false)
      broadcastLockoutToWidget(false)
      console.log('[InputService] Lockout released')
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

      const now = Date.now()

      // Jeśli host poruszył myszką niedawno, ignoruj ruchy gościa
      if (now < hostLockoutUntil) return

      const targetX = Math.round(x)
      const targetY = Math.round(y)

      const readyBridge = await ensureBridgeReady()

      // Wykonaj ruch
      readyBridge.moveMouseAbsolute(targetX, targetY)
      readyBridge.flush()

      // AKTUALIZACJA TRACKERA
      // Informujemy tracker, że ten ruch pochodzi od nas
      lastInjectedX = targetX
      lastInjectedY = targetY
      lastInjectedAt = now
    })

    // ... reszta handlerów bez zmian
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
