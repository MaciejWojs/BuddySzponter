import { Tray, BrowserWindow, nativeImage, screen, ipcMain } from 'electron'
import { isAbsolute, join } from 'path'
import { is } from '@electron-toolkit/utils'
import { quitApp } from '../index' // <-- Importujemy bezpieczne zamykanie

let tray: Tray | null = null
let trayWindow: BrowserWindow | null = null
let trayDefaultImage: Electron.NativeImage | null = null
let trayActiveImage: Electron.NativeImage | null = null
let isMenuOpen = false

let mainWindowRef: BrowserWindow | null = null
let isHostMode = false

const createTrayImage = (iconPath: string): Electron.NativeImage => {
  const resolvedPath = isAbsolute(iconPath) ? iconPath : join(__dirname, iconPath)
  const loadedImage = nativeImage.createFromPath(resolvedPath)
  if (loadedImage.isEmpty()) return nativeImage.createEmpty()

  const resizedImage = loadedImage.resize({ width: 18, height: 18, quality: 'best' })
  if (process.platform === 'darwin') resizedImage.setTemplateImage(true)
  return resizedImage
}

export const trayService = {
  init(mainWindow: BrowserWindow, iconPathDefault: string, iconPathActive?: string) {
    mainWindowRef = mainWindow

    trayDefaultImage = createTrayImage(iconPathDefault)
    trayActiveImage = createTrayImage(iconPathActive ?? iconPathDefault)

    this.createTrayWindow()

    // USUNIĘTE: Nasłuchiwanie na mainWindow.on('hide') i ('show').
    // Teraz będziemy to kontrolować ręcznie z poziomu index.ts

    ipcMain.handle('set-host-tray-mode', (_event, active: boolean) => {
      isHostMode = active
      if (tray) {
        tray.setImage(active && trayActiveImage ? trayActiveImage : trayDefaultImage!)
      }
    })

    // Używamy bezpiecznej funkcji zamykania z ustawieniem flagi
    ipcMain.handle('quit-app', () => {
      quitApp()
    })
  },

  showTrayIcon() {
    if (tray) return

    tray = new Tray(isHostMode && trayActiveImage ? trayActiveImage : trayDefaultImage!)
    tray.setToolTip('BuddySzponter')

    tray.on('click', (_event, bounds) => {
      this.toggleTrayWindow(bounds)
    })

    tray.on('double-click', () => {
      if (!isHostMode) {
        this.restoreMainWindow()
      }
    })
  },

  restoreMainWindow() {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show()
      mainWindowRef.setOpacity(1) // <-- PRZYWRACAMY WIDOCZNOŚĆ
      mainWindowRef.setSkipTaskbar(false) // <-- PRZYWRACAMY NA PASEK ZADAŃ
      mainWindowRef.focus()
    }

    // Ukrywamy tray i menu po przywróceniu okna
    this.hideTrayIcon()
  },

  hideTrayIcon() {
    if (tray) {
      tray.destroy()
      tray = null
    }
    if (trayWindow) {
      isMenuOpen = false
      trayWindow.setPosition(-10000, -10000)
    }
  },

  createTrayWindow() {
    trayWindow = new BrowserWindow({
      width: 300,
      height: 400,
      show: false,
      frame: false,
      fullscreenable: false,
      resizable: false,
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    trayWindow.on('ready-to-show', () => {
      trayWindow?.setPosition(-10000, -10000)
      trayWindow?.showInactive()
    })

    trayWindow.on('blur', () => {
      isMenuOpen = false
      trayWindow?.setPosition(-10000, -10000)
      if (tray && trayDefaultImage && !isHostMode) tray.setImage(trayDefaultImage)
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      trayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/tray-menu`)
    } else {
      trayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'tray-menu' })
    }
  },

  toggleTrayWindow(bounds: Electron.Rectangle) {
    if (!trayWindow || !tray) return

    if (isMenuOpen) {
      isMenuOpen = false
      trayWindow.setPosition(-10000, -10000)
      if (!isHostMode && trayDefaultImage) tray.setImage(trayDefaultImage)
      return
    }

    const { width, height } = trayWindow.getBounds()
    const x = Math.round(bounds.x + bounds.width / 2 - width / 2)
    let y = Math.round(bounds.y - height - 10)

    if (bounds.y < screen.getPrimaryDisplay().workAreaSize.height / 2) {
      y = Math.round(bounds.y + bounds.height + 10)
    }

    isMenuOpen = true
    trayWindow.setPosition(x, y, false)
    if (trayActiveImage) tray.setImage(trayActiveImage)
    trayWindow.focus()
  }
}
