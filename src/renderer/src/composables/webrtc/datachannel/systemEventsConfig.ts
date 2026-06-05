export type LocalPublishProfile = 'host' | 'guest'

let getLocalPublishProfile: () => LocalPublishProfile = () => 'host'
let onHostDisconnect: () => void = () => undefined

export function configureSystemEventsHandlers(options: {
  getLocalPublishProfile: () => LocalPublishProfile
  onHostDisconnect: () => void
}): void {
  getLocalPublishProfile = options.getLocalPublishProfile
  onHostDisconnect = options.onHostDisconnect
}

export function relayGuestDisconnectCommand(): void {
  const relay = new BroadcastChannel('guest-sync-channel')
  relay.postMessage({ type: 'COMMAND_DISCONNECT' })
  relay.close()
}

export function executeIncomingDisconnect(): void {
  if (getLocalPublishProfile() === 'guest') {
    relayGuestDisconnectCommand()
    return
  }

  onHostDisconnect()
}
