import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './createMainWindow'
import { registerSystemActions } from './ipc/registerSystemActions'
import { registerWindowControls } from './ipc/registerWindowControls'

export async function bootstrapMain(): Promise<void> {
  // Wait until Electron has fully initialized.
  await app.whenReady()

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register all IPC channels consumed by the renderer.
  registerWindowControls()
  registerSystemActions()

  // Create the initial application window.
  createMainWindow()

  app.on('activate', () => {
    // macOS behavior: recreate a window when app is re-activated and none exist.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  app.on('window-all-closed', () => {
    // Keep app alive on macOS; quit on other platforms.
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
