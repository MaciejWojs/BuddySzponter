import { BrowserWindow, ipcMain } from 'electron'

export function registerWindowControls(): void {
  ipcMain.on('ping', () => console.log('pong'))

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

  ipcMain.on('window:set-always-on-top', (event, flag: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(flag)
  })
}
