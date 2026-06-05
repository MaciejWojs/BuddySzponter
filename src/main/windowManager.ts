import { app, BrowserWindow } from 'electron'

export let previousBounds: Electron.Rectangle | null = null
let isQuitting = false

export function quitApp(): void {
  isQuitting = true
  app.quit()
  setTimeout(() => {
    app.exit(0)
  }, 800)
}

export function isAppQuitting(): boolean {
  return isQuitting
}

export function markAppQuitting(): void {
  isQuitting = true
}

export function hideWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    const currentBounds = win.getBounds()
    if (currentBounds.x !== -10000 && currentBounds.y !== -10000) {
      previousBounds = currentBounds
    }
    win.setPosition(-10000, -10000)
    win.setSkipTaskbar(true)
  }
}

export function showWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    if (previousBounds) {
      win.setBounds(previousBounds)
      previousBounds = null
    }
    win.setSkipTaskbar(false)
    win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
  }
}
