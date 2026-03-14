import { app, shell } from 'electron'
import { execFile } from 'node:child_process'

export interface SystemActionResult {
  success: boolean
  message?: string
}

function runCommand(command: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function openPathOrThrow(path: string): Promise<void> {
  const result = await shell.openPath(path)
  if (result) {
    throw new Error(result)
  }
}

export async function executeSystemAction(actionId: string): Promise<SystemActionResult> {
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  try {
    switch (actionId) {
      case 'open-task-manager':
        if (isWindows) {
          await runCommand('taskmgr.exe')
        } else if (isMac) {
          await runCommand('open', ['-a', 'Activity Monitor'])
        } else {
          await runCommand('sh', ['-c', 'gnome-system-monitor || ksysguard || xterm -e top'])
        }
        return { success: true }

      case 'open-security-menu':
        return {
          success: false,
          message:
            'Ctrl+Alt+Delete to bezpieczna sekwencja systemu Windows i nie da sie jej otworzyc bezposrednio z aplikacji.'
        }

      case 'lock-computer':
        if (isWindows) {
          await runCommand('rundll32.exe', ['user32.dll,LockWorkStation'])
        } else if (isMac) {
          await runCommand('pmset', ['displaysleepnow'])
        } else {
          await runCommand('loginctl', ['lock-session'])
        }
        return { success: true }

      case 'show-desktop':
        if (!isWindows) {
          return {
            success: false,
            message: 'Akcja Win+D jest obecnie przygotowana tylko dla Windows.'
          }
        }
        await runCommand('powershell.exe', [
          '-NoProfile',
          '-Command',
          '(New-Object -ComObject Shell.Application).ToggleDesktop()'
        ])
        return { success: true }

      case 'minimize-all':
        if (!isWindows) {
          return {
            success: false,
            message: 'Akcja Win+M jest obecnie przygotowana tylko dla Windows.'
          }
        }
        await runCommand('powershell.exe', [
          '-NoProfile',
          '-Command',
          '(New-Object -ComObject Shell.Application).MinimizeAll()'
        ])
        return { success: true }

      case 'open-file-explorer':
        if (isWindows) {
          await runCommand('explorer.exe')
        } else if (isMac) {
          await runCommand('open', [app.getPath('home')])
        } else {
          await runCommand('xdg-open', [app.getPath('home')])
        }
        return { success: true }

      case 'open-run':
        return {
          success: false,
          message:
            'Okno Uruchamianie (Win+R) nie ma stabilnego, wspieranego API do otwierania bezposrednio z aplikacji.'
        }

      case 'open-system-settings':
        if (!isWindows) {
          return {
            success: false,
            message: 'Akcja Win+I jest obecnie przygotowana tylko dla Windows.'
          }
        }
        await runCommand('explorer.exe', ['ms-settings:'])
        return { success: true }

      case 'open-admin-menu':
        return {
          success: false,
          message:
            'Menu Win+X nie ma publicznego API, ktore pozwala je wywolac bezposrednio z aplikacji.'
        }

      case 'open-snipping-tool':
        if (!isWindows) {
          return {
            success: false,
            message: 'Narzędzie Win+Shift+S jest obecnie przygotowane tylko dla Windows.'
          }
        }
        await runCommand('explorer.exe', ['ms-screenclip:'])
        return { success: true }

      case 'power-shutdown':
        if (isWindows) {
          await runCommand('shutdown', ['/s', '/t', '0'])
        } else if (isMac) {
          await runCommand('osascript', ['-e', 'tell app "System Events" to shut down'])
        } else {
          await runCommand('systemctl', ['poweroff'])
        }
        return { success: true }

      case 'power-restart':
        if (isWindows) {
          await runCommand('shutdown', ['/r', '/t', '0'])
        } else if (isMac) {
          await runCommand('osascript', ['-e', 'tell app "System Events" to restart'])
        } else {
          await runCommand('systemctl', ['reboot'])
        }
        return { success: true }

      case 'power-sleep':
        if (isWindows) {
          await runCommand('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'])
        } else if (isMac) {
          await runCommand('pmset', ['sleepnow'])
        } else {
          await runCommand('systemctl', ['suspend'])
        }
        return { success: true }

      case 'folder-this-pc':
        if (!isWindows) {
          return {
            success: false,
            message: 'Ten komputer jest pozycja specyficzna dla Windows.'
          }
        }
        await runCommand('explorer.exe', ['shell:MyComputerFolder'])
        return { success: true }

      case 'folder-downloads':
        await openPathOrThrow(app.getPath('downloads'))
        return { success: true }

      case 'folder-documents':
        await openPathOrThrow(app.getPath('documents'))
        return { success: true }

      case 'folder-pictures':
        await openPathOrThrow(app.getPath('pictures'))
        return { success: true }

      case 'folder-music':
        await openPathOrThrow(app.getPath('music'))
        return { success: true }

      case 'folder-profile':
        await openPathOrThrow(app.getPath('home'))
        return { success: true }

      default:
        return { success: false, message: `Nieznana akcja: ${actionId}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, message: `Nie udalo sie wykonac akcji (${actionId}): ${message}` }
  }
}
