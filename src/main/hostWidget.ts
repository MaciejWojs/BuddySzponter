// src/main/hostWidget.ts
import { BrowserWindow, screen } from 'electron'
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

  const WIDGET_WIDTH = 500
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
    hostWidgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/session/host-widget`)
  } else {
    hostWidgetWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/session/host-widget'
    })
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

export function broadcastLockoutToWidget(payload: { active: boolean; until: number }): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.webContents.send('input:host-lockout', payload)
  }
}
