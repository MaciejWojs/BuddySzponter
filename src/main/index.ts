import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import trayIconDefault from '../../resources/tray/default.png?asset'
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
import fs from 'fs'
import { closeHostWidget, createHostWidget, registerHostWidgetHandlers } from './hostWidget'
import { trayService } from './services/trayService'

let mainWindow: BrowserWindow | null = null
export let isQuitting = false

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
      mainWindow?.hide() // Ukrywa zamiast zamykać
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
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
      dialog.showErrorBox(
        'Welcome Back',
        'Another instance of the app was attempted to be opened, but it has been prevented. The existing instance has been focused instead.'
      )
    })
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    app.commandLine.appendSwitch('disable-renderer-backgrounding')
    app.commandLine.appendSwitch('disable-background-timer-throttling')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

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

    registerHostWidgetHandlers(mainWindow)

    ipcMain.handle('show-host-widget', () => {
      createHostWidget()
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
    })

    ipcMain.handle('hide-host-widget', () => {
      closeHostWidget()
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show()
    })

    ipcMain.handle('hide-to-tray', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide()
      }
    })

    ipcMain.handle('show-main-window', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    session.defaultSession.setDisplayMediaRequestHandler(
      (_request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
          callback({ video: sources[0], audio: 'loopback' })
        })
      },
      { useSystemPicker: true }
    )

    createWindow()

    if (mainWindow) {
      trayService.init(mainWindow, trayIconDefault)
    }

    ipcMain.handle('save-file', async (_, buffer: ArrayBuffer) => {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: 'recording.webm'
      })

      if (!filePath) return

      fs.writeFileSync(filePath, Buffer.from(buffer))
    })

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

    //! Test handshake and encryption
    // handshake()
    //   .then((r) => console.log('Handshake completed'))
    //   .catch((e) => console.error('Handshake failed:', e))

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
