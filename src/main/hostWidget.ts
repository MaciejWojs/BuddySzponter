// src/main/hostWidget.ts
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null
let hostWidgetChatWindow: BrowserWindow | null = null

/** Szerokość jak w `host-widget.vue` (pełny pasek). */
const WIDGET_WIDTH = 440
const WIDGET_MIN_WIDTH = 72
const WIDGET_HEIGHT = 60
/** Jak przy pierwszym `createHostWidget` — góra obszaru roboczego. */
const WIDGET_LAUNCH_Y_OFFSET = 20
const CHAT_WIDTH = 340
const CHAT_HEIGHT = 240

function getHostWidgetLaunchBounds(minimized: boolean): {
  x: number
  y: number
  width: number
  height: number
} {
  const workArea = screen.getPrimaryDisplay().workArea
  const width = minimized ? WIDGET_MIN_WIDTH : WIDGET_WIDTH
  const height = WIDGET_HEIGHT
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: workArea.y + WIDGET_LAUNCH_Y_OFFSET,
    width,
    height
  }
}

function loadWidgetRoute(window: BrowserWindow, routeHash: string): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${routeHash}`)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: routeHash
    })
  }
}

function repositionHostWidgetChatIfNeeded(): void {
  if (!hostWidgetChatWindow || hostWidgetChatWindow.isDestroyed()) {
    return
  }

  if (!hostWidgetChatWindow.isVisible()) {
    return
  }

  const { x, y } = getChatWindowPosition()
  hostWidgetChatWindow.setBounds({ x, y, width: CHAT_WIDTH, height: CHAT_HEIGHT })
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

/**
 * Dopasowuje rozmiar i pozycję okna widgetu.
 * `snapVertical: true` — to samo co przy minimalizacji: wyśrodkowanie w poziomie i przyklejenie do góry obszaru roboczego.
 * Przy `minimized: false` pasek zostaje pełnej szerokości (np. zamknięcie „X” bez zwężania okna).
 */
export function layoutHostWidget(opts: { minimized: boolean; snapVertical?: boolean }): void {
  if (!hostWidgetWindow || hostWidgetWindow.isDestroyed()) {
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea
  const width = opts.minimized ? WIDGET_MIN_WIDTH : WIDGET_WIDTH
  const height = WIDGET_HEIGHT
  const prev = hostWidgetWindow.getBounds()
  const x = Math.round(workArea.x + (workArea.width - width) / 2)

  let y = prev.y
  if (opts.snapVertical) {
    y = workArea.y + WIDGET_LAUNCH_Y_OFFSET
  } else {
    y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height))
  }

  hostWidgetWindow.setBounds({ x, y, width, height })
  repositionHostWidgetChatIfNeeded()
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

  const launch = getHostWidgetLaunchBounds(false)

  hostWidgetWindow = new BrowserWindow({
    width: launch.width,
    height: launch.height,
    x: launch.x,
    y: launch.y,
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
