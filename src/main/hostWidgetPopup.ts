import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let popupWindow: BrowserWindow | null = null
let isHandlerRegistered = false

const POPUP_WIDTH = 104
const POPUP_HEIGHT = 148

export function createHostWidgetPopup(): void {
  if (popupWindow && !popupWindow.isDestroyed()) return

  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    x: 0,
    y: 0,
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
    popupWindow.setAlwaysOnTop(true, 'floating', 1)
    popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  popupWindow.on('close', (event: Electron.Event) => {
    event.preventDefault()
    popupWindow?.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/session/host-widget-popup`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/session/host-widget-popup'
    })
  }

  if (!isHandlerRegistered) {
    isHandlerRegistered = true

    ipcMain.handle('show-host-widget-popup', (_, { x, y }: { x: number; y: number }) => {
      if (!popupWindow || popupWindow.isDestroyed()) {
        createHostWidgetPopup()
      }
      popupWindow!.setMinimumSize(1, 1)
      popupWindow!.setMaximumSize(10000, 10000)
      popupWindow!.setBounds({ x, y, width: POPUP_WIDTH, height: POPUP_HEIGHT })
      popupWindow!.setMinimumSize(POPUP_WIDTH, POPUP_HEIGHT)
      popupWindow!.setMaximumSize(POPUP_WIDTH, POPUP_HEIGHT)
      popupWindow!.showInactive()
    })

    ipcMain.handle('hide-host-widget-popup', () => {
      if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.hide()
      }
    })
  }
}

export function hideHostWidgetPopup(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide()
  }
}
