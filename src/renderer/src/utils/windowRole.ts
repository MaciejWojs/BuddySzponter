export type WindowRole = 'main' | 'guest' | 'widget' | 'tray' | 'host-chat'

function hashLower(): string {
  return window.location.hash.toLowerCase()
}

export function getWindowRole(): WindowRole {
  if (hashLower().includes('guest')) return 'guest'
  if (hashLower().includes('widget')) return 'widget'
  if (hashLower().includes('tray-menu')) return 'tray'
  if (hashLower().includes('host-chat')) return 'host-chat'
  return 'main'
}

export function isGuestWindow(): boolean {
  return getWindowRole() === 'guest'
}

export function isMainWindow(): boolean {
  return getWindowRole() === 'main'
}
