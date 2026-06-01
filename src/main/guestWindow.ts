import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

/** Placeholder URL — tylko ładuje bundle widoku; przy `open-guest-window` okno przeładuje się na prawdziwy `sessionId`. */
export const GUEST_PREWARM_SESSION_ID = '__buddy_prewarm__'

let guestWindow: BrowserWindow | null = null
let lastGuestSessionId: string | null = null

export type GuestWindowVisibility = 'visible' | 'hidden'

function guestRouteHash(sessionId: string): string {
  return `#/session/guest-view?sessionId=${encodeURIComponent(sessionId)}`
}

function loadGuestWindowContent(win: BrowserWindow, sessionId: string): void {
  const route = guestRouteHash(sessionId)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${route}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route
    })
  }
}

function attachGuestShowOnce(win: BrowserWindow, showAfter: boolean): void {
  win.once('ready-to-show', () => {
    if (showAfter) {
      win.show()
      win.focus()
    }
  })
}

export function createGuestWindow(
  sessionId: string,
  visibility: GuestWindowVisibility = 'visible'
): void {
  const showAfter = visibility === 'visible'

  if (guestWindow && !guestWindow.isDestroyed()) {
    if (lastGuestSessionId !== sessionId) {
      lastGuestSessionId = sessionId
      attachGuestShowOnce(guestWindow, showAfter)
      loadGuestWindowContent(guestWindow, sessionId)
    } else if (showAfter) {
      guestWindow.show()
      guestWindow.focus()
    }
    return
  }

  lastGuestSessionId = sessionId

  guestWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    icon,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  })

  guestWindow.on('closed', () => {
    guestWindow = null
    lastGuestSessionId = null
  })

  attachGuestShowOnce(guestWindow, showAfter)
  loadGuestWindowContent(guestWindow, sessionId)
}

export function prewarmGuestWindow(): void {
  if (guestWindow && !guestWindow.isDestroyed()) {
    return
  }
  createGuestWindow(GUEST_PREWARM_SESSION_ID, 'hidden')
}

export function closeGuestWindow(): void {
  if (guestWindow && !guestWindow.isDestroyed()) {
    guestWindow.close()
  }
}

export function registerGuestWindowHandlers(): void {
  ipcMain.handle('app:resize-to-video-ratio', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const ratio = width / height

    win.setAspectRatio(0)

    const currentContentBounds = win.getContentBounds()

    const targetContentHeight = Math.round(currentContentBounds.width / ratio)

    win.setContentBounds(
      {
        x: currentContentBounds.x,
        y: currentContentBounds.y,
        width: currentContentBounds.width,
        height: targetContentHeight
      },
      true
    )
  })

  ipcMain.handle('app:reset-aspect-ratio', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setAspectRatio(0)
  })
}
