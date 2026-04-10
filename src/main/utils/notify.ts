import { BrowserWindow } from 'electron'
import { WsServerEvents } from '../../shared/schemas/ipc'

export function notifyFrontend<K extends keyof WsServerEvents>(
  channel: K,
  payload: WsServerEvents[K]
): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send(channel, payload)
      } catch (err) {
        console.error('Error sending from webContent:', err)
      }
    }
  })
}
