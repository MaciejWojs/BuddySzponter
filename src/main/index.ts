import { app, shell, BrowserWindow, ipcMain } from 'electron'
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

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

function createSharedWindow(): void {
  const sharedWindow = new BrowserWindow({
    frame: false,
    fullscreen: true,
    transparent: false,
    backgroundColor: '#03000c',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  sharedWindow.on('ready-to-show', () => {
    sharedWindow.show()
  })

  sharedWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Wersja dev/produkcyjna
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    sharedWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/shared')
  } else {
    sharedWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'shared' })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

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

  createMainWindow()

  // IPC do otwierania okna sesji (shared)
  ipcMain.on('open-shared-window', () => {
    createSharedWindow()
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

    //     if (BrowserWindow.getAllWindows().length === 0) createWindow()
    //   })
    // })

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    // --- PONIŻSZA FUNKCJA I IPC SĄ PRZYGOTOWANE POD PRZYSZŁĄ INTEGRACJĘ UDOSTĘPNIANIA OBRAZU ---
    // function createSharedWindow(): void {
    //   const sharedWindow = new BrowserWindow({
    //     frame: false,
    //     fullscreen: true,
    //     transparent: false,
    //     backgroundColor: '#03000c',
    //     show: false,
    //     autoHideMenuBar: true,
    //     ...(process.platform === 'linux' ? { icon } : {}),
    //     webPreferences: {
    //       preload: join(__dirname, '../preload/index.js'),
    //       sandbox: false
    //     }
    //   })
    //
    //   sharedWindow.on('ready-to-show', () => {
    //     sharedWindow.show()
    //   })
    //
    //   sharedWindow.webContents.setWindowOpenHandler((details) => {
    //     shell.openExternal(details.url)
    //     return { action: 'deny' }
    //   })
    //

    //   if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    //     sharedWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/shared')
    //   } else {
    //     sharedWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'shared' })
    //   }
    // }

    // app.whenReady().then(() => {
    //   ipcMain.on('open-shared-window', () => {
    //     createSharedWindow()
    //   })
    // })

    // --- KONIEC BLOKU DO INTEGRACJI ---
  })
})
