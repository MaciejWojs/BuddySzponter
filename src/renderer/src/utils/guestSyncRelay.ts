import type { ChatPayload } from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { isGuestWindow } from '@renderer/utils/windowRole'

const GUEST_SYNC_CHANNEL = 'guest-sync-channel'

function postGuestSyncMessage(message: { type: string; payload: ChatPayload }): void {
  try {
    const bc = new BroadcastChannel(GUEST_SYNC_CHANNEL)
    bc.postMessage(message)
    bc.close()
  } catch {
    // BroadcastChannel may not be available in every context
  }
}

export function relayOutgoingChatFromMainWindow(payload: ChatPayload): void {
  if (isGuestWindow()) return
  postGuestSyncMessage({ type: 'RELAY_CHAT_OUTGOING', payload })
}

export function relayIncomingChatToMainWindow(payload: ChatPayload): void {
  if (!isGuestWindow()) return
  postGuestSyncMessage({ type: 'RELAY_CHAT', payload })
}
