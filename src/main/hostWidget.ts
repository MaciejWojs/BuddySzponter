// src/main/hostWidget.ts
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null
let hostWidgetChatWindow: BrowserWindow | null = null

const WIDGET_WIDTH = 500
const WIDGET_HEIGHT = 60
const CHAT_WIDTH = 340
const CHAT_HEIGHT = 240

function loadWidgetRoute(window: BrowserWindow, routeHash: string): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${routeHash}`)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: routeHash
    })
  }
}

function getChatWindowPosition(): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea

  if (!hostWidgetWindow || hostWidgetWindow.isDestroyed()) {
    return {
      x: Math.round(workArea.x + workArea.width / 2 - CHAT_WIDTH / 2),
      y: Math.round(workArea.y + 88)
    }
  }

  const widgetBounds = hostWidgetWindow.getBounds()
  const rawX = widgetBounds.x + widgetBounds.width - CHAT_WIDTH
  const rawY = widgetBounds.y + widgetBounds.height + 8

  const x = Math.max(workArea.x + 8, Math.min(rawX, workArea.x + workArea.width - CHAT_WIDTH - 8))
  const y = Math.max(workArea.y + 8, Math.min(rawY, workArea.y + workArea.height - CHAT_HEIGHT - 8))

  return { x, y }
}

function createHostWidgetChat(): void {
  if (hostWidgetChatWindow && !hostWidgetChatWindow.isDestroyed()) {
    const { x, y } = getChatWindowPosition()
    hostWidgetChatWindow.setBounds({ x, y, width: CHAT_WIDTH, height: CHAT_HEIGHT })
    hostWidgetChatWindow.showInactive()
    return
  }

  const { x, y } = getChatWindowPosition()

  hostWidgetChatWindow = new BrowserWindow({
    width: CHAT_WIDTH,
    height: CHAT_HEIGHT,
    x,
    y,
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
    parent: hostWidgetWindow ?? undefined,
    type: process.platform === 'linux' ? 'toolbar' : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostWidgetChatWindow.setAlwaysOnTop(true, 'floating')
  }

  hostWidgetChatWindow.on('ready-to-show', () => {
    hostWidgetChatWindow?.showInactive()
  })

  hostWidgetChatWindow.on('closed', () => {
    hostWidgetChatWindow = null
  })

  loadWidgetRoute(hostWidgetChatWindow, '/session/host-widget-chat')
}

export function createHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

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

  hostWidgetWindow.on('closed', () => {
    hostWidgetWindow = null
    closeHostWidgetChat()
  })

  loadWidgetRoute(hostWidgetWindow, '/session/host-widget')
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

  closeHostWidgetChat()
}

export function closeHostWidgetChat(): void {
  if (hostWidgetChatWindow && !hostWidgetChatWindow.isDestroyed()) {
    hostWidgetChatWindow.close()
  }
}

export function toggleHostWidgetChat(): boolean {
  if (hostWidgetChatWindow && !hostWidgetChatWindow.isDestroyed()) {
    if (hostWidgetChatWindow.isVisible()) {
      hostWidgetChatWindow.hide()
      return false
    }

    const { x, y } = getChatWindowPosition()
    hostWidgetChatWindow.setBounds({ x, y, width: CHAT_WIDTH, height: CHAT_HEIGHT })
    hostWidgetChatWindow.showInactive()
    return true
  }

  createHostWidgetChat()
  return true
}

export function broadcastLockoutToWidget(payload: { active: boolean; until: number }): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.webContents.send('input:host-lockout', payload)
  }
}
