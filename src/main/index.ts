import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer, dialog } from 'electron'
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
import { wsService } from './services/ws/WsService'
import { screenService } from './services/screenService'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock && !import.meta.env.DEV) {
  app.quit()
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Ktoś próbował uruchomić drugą instancję, więc przywracamy pierwszą
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    dialog.showErrorBox('Welcome Back', 'Another instance of the app was attempted to be opened, but it has been prevented. The existing instance has been focused instead.')
  })

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
  wsService.registerHandlers()
  screenService.registerHandlers()

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        console.log(
          'Available screens for capture:',
          sources.map((s) => s.name)
        )
        callback({ video: sources[0], audio: 'loopback' })
      })
    },
    { useSystemPicker: true }
  )

  createWindow()

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
