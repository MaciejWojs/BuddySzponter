// src/main/guestWindow.ts
import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let guestWindow: BrowserWindow | null = null

export function createGuestWindow(sessionId: string): void {
  if (guestWindow && !guestWindow.isDestroyed()) {
    guestWindow.focus()
    return
  }

  guestWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  guestWindow.on('ready-to-show', () => {
    guestWindow?.show()
  })

  const route = `#/session/guest-view?sessionId=${sessionId}`

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    guestWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${route}`)
  } else {
    guestWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route
    })
  }
}

export function closeGuestWindow(): void {
  if (guestWindow && !guestWindow.isDestroyed()) {
    guestWindow.close()
  }
}
