// src/main/hostWidget.ts
import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null

export function initHostWidget(): void {
  if (hostWidgetWindow) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  const WIDGET_WIDTH = 300
  const WIDGET_HEIGHT = 60

  hostWidgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: width / 2 - WIDGET_WIDTH / 2,
    y: 20,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostWidgetWindow.setAlwaysOnTop(true, 'floating')
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hostWidgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/host-widget`)
  } else {
    hostWidgetWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'host-widget' })
  }
}

export function showHostWidget(): void {
  if (hostWidgetWindow) {
    hostWidgetWindow.show()
  }
}

export function closeHostWidget(): void {
  if (hostWidgetWindow) {
    // 2. UKRYWAMY ZAMIAST NISZCZYĆ
    hostWidgetWindow.hide()
  }
}

export function registerHostWidgetHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.on('widget-close-session', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('host-session-ended')
    }
    closeHostWidget()
  })
}

export function broadcastLockoutToWidget(isLockedOut: boolean): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.webContents.send('input:host-lockout', isLockedOut)
  }
}
