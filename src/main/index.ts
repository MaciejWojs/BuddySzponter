import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { handshake } from './utils/handshake'
import { secureStore } from './store/secureStore'
import { API_ROUTES } from './apiRoutes'
import { appSettings } from './services/SettingsService'
import { clearLocalStore, localStore } from './store/localStore'
import {
  isAppThemeMode,
  isCaptureBackendMode,
  isVideoQualityPreset
} from '../shared/schemas/appPreferences'
import { authService } from './services/AuthService'
import { coreService } from './services/CoreService'
import { userService } from './services/UserService'
import { connectionService } from './services/ConnectionService'
import { screenService } from './services/screenService'
import { wsService } from './services/ws/WsService'

// --- ODBLOKOWANE: Importy hostWidget ---
import { closeHostWidget, createHostWidget, prewarmHostWidget } from './hostWidget'
import { createHostWidgetPopup, hideHostWidgetPopup } from './hostWidgetPopup'
import {
  createHostChatWindow,
  hideHostChatWindow,
  isHostChatWindowVisible,
  prewarmHostChatWindow,
  showHostChatWindow
} from './hostChatWindow'
import { inputService } from './services/inputService'
import { registerFileTransferHandlers } from './services/fileTransferService'
import {
  closeGuestWindow,
  createGuestWindow,
  prewarmGuestWindow,
  registerGuestWindowHandlers
} from './guestWindow'
import trayIconDefault from '../../resources/tray/default.png?asset'
import { trayService } from './services/trayService'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function quitApp(): void {
  isQuitting = true
  app.quit()
  // Some auxiliary windows prevent close() by design; force process exit as a fallback.
  setTimeout(() => {
    app.exit(0)
  }, 800)
}

export let previousBounds: Electron.Rectangle | null = null

// Funkcja bezpiecznego ukrywania bez zabijania WebRTC (off-screen trick)
export function hideWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    const currentBounds = win.getBounds()
    // Zapisujemy pozycję tylko jeśli nie jesteśmy już poza ekranem
    if (currentBounds.x !== -10000 && currentBounds.y !== -10000) {
      previousBounds = currentBounds
    }
    win.setPosition(-10000, -10000)
    win.setSkipTaskbar(true)
  }
  trayService.showTrayIcon()
}

export function showWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    if (previousBounds) {
      win.setBounds(previousBounds)
      previousBounds = null
    }
    win.setSkipTaskbar(false)
    win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  trayService.hideTrayIcon()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const closeToTray = localStore.get('closeToTray')
      if (closeToTray !== false) {
        event.preventDefault()
        hideWindowSafely(mainWindow)
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const useSingleInstanceLock = !import.meta.env.DEV
const gotTheLock = useSingleInstanceLock ? app.requestSingleInstanceLock() : true

app.on('before-quit', () => {
  isQuitting = true
})

if (!gotTheLock) {
  app.quit()
} else {
  if (useSingleInstanceLock) {
    app.on('second-instance', () => {
      showWindowSafely(mainWindow)
    })
  }

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.buddyszponter.app')

    app.commandLine.appendSwitch('disable-renderer-backgrounding')
    app.commandLine.appendSwitch('disable-background-timer-throttling')
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
    app.commandLine.appendSwitch('enable-transparent-visuals')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    if (import.meta.env.VITE_CLEAR_STORES === 'true') {
      clearLocalStore()
      secureStore.clearSession()
      console.log('Stores cleared on startup due to VITE_CLEAR_STORES=true')
    }

    authService.registerHandler()
    appSettings.registerHandlers()
    coreService.registerHandlers()
    userService.registerHandler()
    connectionService.registerHandlers()
    screenService.registerHandlers()
    wsService.registerWsHandlers()
    registerGuestWindowHandlers()

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const url = `${baseURL}${API_ROUTES.CRYPTO.HANDSHAKE}`
      const r = await handshake(url)
      secureStore.setSecure('sessionId', r.sessionId)
      secureStore.setSecure('aesKey', r.aesKey)
      console.log('Handshake completed, sessionId and aesKey stored securely')
    } catch (error) {
      console.error('Error during handshake:', error)
    }

    createWindow()

    if (mainWindow) {
      trayService.init(mainWindow, trayIconDefault)
    }

    // --- BEZPIECZNA REJESTRACJA WIDGETU ---
    try {
      if (mainWindow) {
        inputService.init(mainWindow)
      }
    } catch (error) {
      console.error('Error registering host widget handlers:', error)
    }

    registerFileTransferHandlers()

    // --- IPC MAIN HANDLERY DLA WIDGETU ---
    ipcMain.handle('show-host-widget', () => {
      createHostWidget()
      createHostWidgetPopup()
      hideWindowSafely(mainWindow)
    })

    ipcMain.handle('hide-host-widget', () => {
      closeHostWidget()
      hideHostChatWindow()
      hideHostWidgetPopup()
      showWindowSafely(mainWindow)
    })

    ipcMain.handle('show-host-chat-window', () => {
      if (isHostChatWindowVisible()) {
        hideHostChatWindow()
        return false
      }
      createHostChatWindow()
      showHostChatWindow()
      return true
    })

    ipcMain.handle('hide-host-chat-window', () => {
      hideHostChatWindow()
    })

    ipcMain.handle('prewarm-host-chat-window', () => {
      prewarmHostChatWindow()
    })

    ipcMain.handle('prewarm-guest-window', () => {
      prewarmGuestWindow()
    })

    ipcMain.handle('prewarm-host-widget-window', () => {
      prewarmHostWidget()
    })

    ipcMain.handle('prewarm-host-widget-popup', () => {
      createHostWidgetPopup()
    })

    ipcMain.handle('app:open-guest-window', (_, sessionId: string) => {
      createGuestWindow(sessionId)
      hideWindowSafely(mainWindow)
    })

    ipcMain.handle('app:close-guest-window', () => {
      closeGuestWindow()
      showWindowSafely(mainWindow)
    })

    ipcMain.handle('hide-to-tray', () => {
      hideWindowSafely(mainWindow)
    })

    ipcMain.handle('app:get-preferences', () => ({
      videoQualityPreset: localStore.get('videoQualityPreset') ?? 'high',
      closeToTray: localStore.get('closeToTray') !== false,
      theme: isAppThemeMode(localStore.get('theme')) ? localStore.get('theme') : 'dark'
    }))

    ipcMain.handle(
      'app:set-preferences',
      (
        _event,
        prefs: Partial<{
          videoQualityPreset: string
          closeToTray: boolean
          theme: string
          captureBackend: string
        }>
      ) => {
        if (prefs.videoQualityPreset != null && isVideoQualityPreset(prefs.videoQualityPreset)) {
          localStore.set('videoQualityPreset', prefs.videoQualityPreset)
        }
        if (typeof prefs.closeToTray === 'boolean') {
          localStore.set('closeToTray', prefs.closeToTray)
        }
        if (prefs.theme != null && isAppThemeMode(prefs.theme)) {
          localStore.set('theme', prefs.theme)
        }
        if (prefs.captureBackend != null && isCaptureBackendMode(prefs.captureBackend)) {
          localStore.set('captureBackend', prefs.captureBackend)
        }
      }
    )

    ipcMain.handle('app:get-open-at-login', () => app.getLoginItemSettings().openAtLogin)

    ipcMain.handle('app:set-open-at-login', (_event, open: boolean) => {
      const enabled = Boolean(open)

      if (process.platform === 'darwin') {
        app.setLoginItemSettings({ openAtLogin: enabled })
        return
      }

      // Windows / Linux: bez jawnej ścieżki i argumentów wpis autostartu często nie działa
      if (process.platform === 'win32' || process.platform === 'linux') {
        const args = app.isPackaged ? [] : process.argv[1] ? [process.argv[1]] : []
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: process.execPath,
          args
        })
        return
      }

      app.setLoginItemSettings({ openAtLogin: enabled })
    })

    ipcMain.handle('show-main-window', () => {
      showWindowSafely(mainWindow)
    })

    ipcMain.handle('quit-app', () => {
      quitApp()
    })

    // ipcMain.handle('save-file', async (_, buffer: ArrayBuffer) => {
    //   const { filePath } = await dialog.showSaveDialog({ defaultPath: 'recording.webm' })
    //   if (!filePath) return
    //   fs.writeFileSync(filePath, Buffer.from(buffer))
    // })

    // Uwaga: `useSystemPicker: true` w produkcji potrafi powodować zawieszenie
    // `getDisplayMedia` na Windowsie (picker nie pojawia się, Promise nie resolvuje),
    // co blokuje cały `startHostCapture` i w efekcie akceptację sesji.
    // Używamy własnego callbacku, który deterministycznie zwraca pierwszy ekran.
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          if (!sources || sources.length === 0) {
            console.warn('[DisplayMedia] Brak źródeł ekranu, anulowanie żądania.')
            callback({})
            return
          }
          callback({ video: sources[0], audio: 'loopback' })
        })
        .catch((err) => {
          console.error('[DisplayMedia] Błąd pobierania źródeł:', err)
          callback({})
        })
    })

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
