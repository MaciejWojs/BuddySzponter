// src/main/hostWidget.ts
import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hostWidgetWindow: BrowserWindow | null = null

// Zmieniono nazwę na createHostWidget, aby pasowała do importu w index.ts
export function createHostWidget(): void {
  // Jeśli widget już istnieje, po prostu go pokazujemy i przerywamy tworzenie nowego
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  const WIDGET_WIDTH = 300
  const WIDGET_HEIGHT = 60

  hostWidgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: Math.round(width / 2 - WIDGET_WIDTH / 2),
    y: 20,
    show: false, // Pokażemy po załadowaniu w 'ready-to-show'
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.platform === 'darwin') {
    hostWidgetWindow.setAlwaysOnTop(true, 'floating')
  }

  // Czekamy aż widget się wyrenderuje, żeby nie było mignięcia
  hostWidgetWindow.on('ready-to-show', () => {
    // Używamy showInactive, żeby widget nie kradł focusu z aplikacji,
    // w której użytkownik akurat pracuje
    hostWidgetWindow?.showInactive()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hostWidgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/host-widget`)
  } else {
    hostWidgetWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'host-widget' })
  }
}

export function showHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.showInactive()
  }
}

export function closeHostWidget(): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    // UKRYWAMY ZAMIAST NISZCZYĆ (zgodnie z założeniem)
    hostWidgetWindow.hide()
  }
}

export function registerHostWidgetHandlers(mainWindow: BrowserWindow | null): void {
  // Obsługa starego sygnału .send()
  ipcMain.on('widget-close-session', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('host-session-ended')
    }
    closeHostWidget()
  })

  // ==========================================
  // NOWE: Obsługa sygnałów .invoke() z pliku Vue
  // Przekazujemy zdarzenia z widgetu prosto do głównego okna aplikacji
  // ==========================================

  ipcMain.handle('widget:toggle-mute', (_event, payload: { muted: boolean }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-mute', payload)
    }
  })

  // Dodany handler do przekazania kontroli
  ipcMain.handle('widget:toggle-control', (_event, payload: { granted: boolean }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-control', payload)
    }
  })

  ipcMain.handle('widget:toggle-chat', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:toggle-chat')
    }
  })

  ipcMain.handle('widget:end-session', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget:end-session')
    }
    closeHostWidget()
  })
}

export function broadcastLockoutToWidget(isLockedOut: boolean): void {
  if (hostWidgetWindow && !hostWidgetWindow.isDestroyed()) {
    hostWidgetWindow.webContents.send('input:host-lockout', isLockedOut)
  }
}
