import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostChatWindow: BrowserWindow | null = null
let isMoveHandlerRegistered = false

const WINDOW_WIDTH = 360
const WINDOW_HEIGHT = 480

export type HostChatCreateMode = 'visible' | 'hidden'

export function createHostChatWindow(mode: HostChatCreateMode = 'visible'): void {
  const startHidden = mode === 'hidden'

  if (hostChatWindow && !hostChatWindow.isDestroyed()) {
    if (!startHidden) {
      hostChatWindow.showInactive()
    }
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  hostChatWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: Math.round(width - WINDOW_WIDTH - 40),
    y: Math.round(height - WINDOW_HEIGHT - 40),
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    hasShadow: false,
    focusable: true,
    type: process.platform === 'linux' ? 'toolbar' : 'panel',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostChatWindow.setAlwaysOnTop(true, 'floating', 1)
    hostChatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  hostChatWindow.on('close', (event: Electron.Event) => {
    event.preventDefault()
    hostChatWindow?.hide()
  })

  hostChatWindow.once('ready-to-show', () => {
    if (!startHidden) {
      hostChatWindow?.showInactive()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hostChatWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/session/host-chat`)
  } else {
    hostChatWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/session/host-chat'
    })
  }

  if (!isMoveHandlerRegistered) {
    ipcMain.on('move-host-chat-window', (event, { x, y }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win || win.isDestroyed()) return
      const bounds = win.getBounds()
      win.setBounds({ x, y, width: bounds.width, height: bounds.height })
    })
    isMoveHandlerRegistered = true
  }
}

export function prewarmHostChatWindow(): void {
  if (hostChatWindow && !hostChatWindow.isDestroyed()) {
    return
  }
  createHostChatWindow('hidden')
}

export function showHostChatWindow(): void {
  if (hostChatWindow && !hostChatWindow.isDestroyed()) {
    hostChatWindow.showInactive()
    return
  }
  createHostChatWindow('visible')
}

export function hideHostChatWindow(): void {
  if (hostChatWindow && !hostChatWindow.isDestroyed()) {
    hostChatWindow.hide()
  }
}

export function isHostChatWindowVisible(): boolean {
  return Boolean(hostChatWindow && !hostChatWindow.isDestroyed() && hostChatWindow.isVisible())
}
