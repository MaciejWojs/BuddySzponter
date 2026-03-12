import { ipcMain } from 'electron'
import { executeSystemAction } from '../systemActions'

export function registerSystemActions(): void {
  ipcMain.handle('system:execute-action', (_, actionId: string) => executeSystemAction(actionId))
}
