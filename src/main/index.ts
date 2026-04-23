import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { handshake } from './utils/handshake'
import { secureStore } from './store/secureStore'
import { API_ROUTES } from './apiRoutes'
import { appSettings } from './services/SettingsService'
import { clearLocalStore } from './store/localStore'
import { authService } from './services/AuthService'
import { coreService } from './services/CoreService'
import { userService } from './services/UserService'
import { connectionService } from './services/ConnectionService'
import { screenService } from './services/screenService'
import { wsService } from './services/ws/WsService'

// --- ODBLOKOWANE: Importy hostWidget ---
import { closeHostWidget, createHostWidget, registerHostWidgetHandlers } from './hostWidget'
import { inputService } from './services/inputService'
// import trayIconDefault from '../../resources/tray/default.png?asset'
// import { trayService } from './services/trayService'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled promise rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('[main] Uncaught exception:', error)
})

export function quitApp(): void {
  isQuitting = true
  app.quit()
}

// Funkcja bezpiecznego ukrywania (minimalizacji) bez zabijania WebRTC
function hideWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    win.minimize()
    // Jeśli wolisz, żeby okno całkowicie zniknęło, a nie było zminimalizowane na pasku,
    // użyj poniższych dwóch linii zamiast win.minimize():
    // win.setOpacity(0)
    // win.setSkipTaskbar(true)
  }
}

function showWindowSafely(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    // Jeśli używasz opacity zamiast minimize, odkomentuj to:
    // win.setOpacity(1)
    // win.setSkipTaskbar(false)
    win.show()
    win.focus()
  }
}

function waitForWindowReady(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) {
    return Promise.reject(new Error('Main window is destroyed before ready-to-show'))
  }

  if (!win.webContents.isLoadingMainFrame()) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      win.removeListener('closed', onClosed)
      win.removeListener('ready-to-show', onReady)
      win.webContents.removeListener('did-fail-load', onFailLoad)
      win.webContents.removeListener('render-process-gone', onRenderGone)
    }

    const onReady = (): void => {
      cleanup()
      resolve()
    }

    const onClosed = (): void => {
      cleanup()
      reject(new Error('Main window closed before it became ready'))
    }

    const onFailLoad = (_event: Electron.Event, code: number, description: string): void => {
      cleanup()
      reject(new Error(`Main window failed to load: ${description} (${code})`))
    }

    const onRenderGone = (_event: Electron.Event, details: Electron.RenderProcessGoneDetails): void => {
      cleanup()
      reject(new Error(`Renderer process gone before ready: ${details.reason}`))
    }

    win.once('ready-to-show', onReady)
    win.once('closed', onClosed)
    win.webContents.once('did-fail-load', onFailLoad)
    win.webContents.once('render-process-gone', onRenderGone)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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
      event.preventDefault()
      hideWindowSafely(mainWindow)
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
    electronApp.setAppUserModelId('com.electron')

    app.commandLine.appendSwitch('disable-renderer-backgrounding')
    app.commandLine.appendSwitch('disable-background-timer-throttling')
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
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

    // --- BEZPIECZNA REJESTRACJA WIDGETU ---
    try {
      if (mainWindow) {
        registerHostWidgetHandlers(mainWindow)
        await waitForWindowReady(mainWindow)
        await inputService.init(mainWindow)
      }
    } catch (error) {
      console.error('[main] Input service startup failed (host widget handlers may be registered):', error)
    }

    // --- IPC MAIN HANDLERY DLA WIDGETU ---
    ipcMain.handle('show-host-widget', () => {
      createHostWidget()
      hideWindowSafely(mainWindow)
    })

    ipcMain.handle('hide-host-widget', () => {
      closeHostWidget()
      showWindowSafely(mainWindow)
    })

    ipcMain.handle('hide-to-tray', () => {
      hideWindowSafely(mainWindow)
    })

    ipcMain.handle('show-main-window', () => {
      showWindowSafely(mainWindow)
    })

    ipcMain.handle('set-host-tray-mode', () => {
      /* na razie wyłączone z trayService */
    })

    ipcMain.handle('quit-app', () => {
      quitApp()
    })

    // ipcMain.handle('save-file', async (_, buffer: ArrayBuffer) => {
    //   const { filePath } = await dialog.showSaveDialog({ defaultPath: 'recording.webm' })
    //   if (!filePath) return
    //   fs.writeFileSync(filePath, Buffer.from(buffer))
    // })

    session.defaultSession.setDisplayMediaRequestHandler(
      (_request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
          callback({ video: sources[0], audio: 'loopback' })
        })
      },
      { useSystemPicker: true }
    )

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
