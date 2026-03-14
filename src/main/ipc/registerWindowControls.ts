import { BrowserWindow, ipcMain } from 'electron'

export function registerWindowControls(): void {
  // Simple health-check channel for IPC connectivity.
  ipcMain.on('ping', () => console.log('pong'))

  // Each handler targets the BrowserWindow that sent the event.
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // Toggle always-on-top for the sender window.
  ipcMain.on('window:set-always-on-top', (event, flag: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(flag)
  })
}
