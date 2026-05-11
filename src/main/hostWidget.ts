import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null
let isModeHandlerRegistered = false

export function createHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  const WIDGET_WIDTH = 600
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
    closable: false,
    hasShadow: false,
    focusable: false,

    type: process.platform === 'linux' ? 'toolbar' : 'panel',

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostWidgetWindow.setAlwaysOnTop(true, 'floating', 1)
    hostWidgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  if (process.platform === 'win32') {
    hostWidgetWindow.on('system-context-menu', (event) => {
      event.preventDefault()
    })

    hostWidgetWindow.hookWindowMessage(0x0112, (wParam) => {
      const SC_MINIMIZE = 0xf020

      if (wParam.readUInt32LE(0) === SC_MINIMIZE) {
        return true
      }

      return false
    })
  }
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  hostWidgetWindow.on('minimize' as any, (event: Electron.Event) => {
    event.preventDefault()

    hostWidgetWindow?.restore()
    hostWidgetWindow?.showInactive()
  })

  hostWidgetWindow.on('close', (event: Electron.Event) => {
    event.preventDefault()
  })

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

  if (!isModeHandlerRegistered) {
    ipcMain.handle('set-host-widget-mode', (_, mode: 'normal' | 'compact' | 'hidden' | 'peek') => {
      setHostWidgetMode(mode)
    })
    ipcMain.on('move-host-widget', (event, { x, y }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win || win.isDestroyed()) return
      const bounds = win.getBounds()
      win.setBounds({ x, y, width: bounds.width, height: bounds.height })
    })
    isModeHandlerRegistered = true
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

export function setHostWidgetMode(mode: 'normal' | 'compact' | 'hidden' | 'peek'): void {
  if (!hostWidgetWindow || hostWidgetWindow.isDestroyed()) return

  const bounds = hostWidgetWindow.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const { width, x: screenX, y: screenY } = display.bounds

  let w = 600
  let h = 60
  let y = 20

  if (mode === 'compact') {
    w = 60
    h = 60
  } else if (mode === 'hidden') {
    w = 60
    h = 5
    y = 0
  } else if (mode === 'peek') {
    w = 60
    h = 60
    y = 0
  }

  hostWidgetWindow.setMinimumSize(1, 1)
  hostWidgetWindow.setMaximumSize(10000, 10000)

  hostWidgetWindow.setBounds({
    width: w,
    height: h,
    x: screenX + Math.round(width / 2 - w / 2),
    y: screenY + y
  })

  hostWidgetWindow.setMinimumSize(w, h)
  hostWidgetWindow.setMaximumSize(w, h)
}
