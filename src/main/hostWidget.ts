// src/main/hostWidget.ts
import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null

export function createHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  const WIDGET_WIDTH = 300
  const WIDGET_HEIGHT = 60

  hostWidgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: Math.round(width / 2 - WIDGET_WIDTH / 2),
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

    backgroundColor: '#00000000',

    type: process.platform === 'linux' ? 'toolbar' : undefined,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostWidgetWindow.setAlwaysOnTop(true, 'floating')
  }

  hostWidgetWindow.on('ready-to-show', () => {
    hostWidgetWindow?.showInactive()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hostWidgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/host-widget`)
  } else {
    hostWidgetWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'host-widget' })
  }
}

export function showHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
  }
}

export function closeHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
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

  ipcMain.handle('widget:toggle-mute', (_event, payload: { muted: boolean }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-mute', payload)
    }
  })

  ipcMain.handle('widget:toggle-control', (_event, payload: { granted: boolean }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-control', payload)
    }
  })

  ipcMain.handle('widget:toggle-chat', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-chat')
    }
  })

  ipcMain.handle('widget:end-session', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:end-session')
    }
    closeHostWidget()
  })
}

export function broadcastLockoutToWidget(payload: { active: boolean; until: number }): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.webContents.send('input:host-lockout', payload)
  }
}
