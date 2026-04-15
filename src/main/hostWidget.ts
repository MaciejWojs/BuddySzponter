// src/main/hostWidget.ts
import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null

export function createHostWidget(): void {
  if (hostWidgetWindow) {
    hostWidgetWindow.show()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  const WIDGET_WIDTH = 300
  const WIDGET_HEIGHT = 60

  hostWidgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: width / 2 - WIDGET_WIDTH / 2,
    y: 20,

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

  hostWidgetWindow.on('closed', () => {
    hostWidgetWindow = null
  })
}

export function closeHostWidget(): void {
  if (hostWidgetWindow) {
    hostWidgetWindow.close()
    hostWidgetWindow = null
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
