import { ipcMain } from 'electron'
import { executeSystemAction } from '../systemActions'

export function registerSystemActions(): void {
  // Async IPC endpoint that executes mapped system actions.
  ipcMain.handle('system:execute-action', (_, actionId: string) => executeSystemAction(actionId))
}
