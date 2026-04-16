// src/main/services/inputService.ts
import { ipcMain } from 'electron'
import { InputBridge } from '@maciejwojs/input-bridge'

let bridge: InputBridge | null = null
let isOptimizationEnabled = false
let handlersRegistered = false

const ensureBridgeReady = async (): Promise<InputBridge> => {
  if (bridge) return bridge

  const nextBridge = new InputBridge({ autoFlush: false })
  await nextBridge.init()

  isOptimizationEnabled = nextBridge.toggleOptimization()
  nextBridge.optimizeMouseMovesAbsolute(2)

  console.log(`[InputBridge] Zainicjowano. Optymalizacja ruchu myszy: ${isOptimizationEnabled}`)

  bridge = nextBridge
  return nextBridge
}

export const inputService = {
  async init() {
    await ensureBridgeReady()
    this.registerHandlers()
  },

  registerHandlers() {
    if (handlersRegistered) return
    handlersRegistered = true

    ipcMain.handle('input:move-absolute', async (_event, x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return

      const readyBridge = await ensureBridgeReady()
      readyBridge.moveMouseAbsolute(Math.round(x), Math.round(y))
      readyBridge.flush()
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
