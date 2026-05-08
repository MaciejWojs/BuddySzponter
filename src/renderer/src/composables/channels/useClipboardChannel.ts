import { ref } from 'vue'
import type { Ref } from 'vue'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'

type ClipboardChannelApi = {
  pushClipboardTextToPeer: () => Promise<void>
  requestClipboardTextFromPeer: () => void
  isTransferring: Ref<boolean>
  transferError: Ref<string | null>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown clipboard error'
}

export function useClipboardChannel(): ClipboardChannelApi {
  const isTransferring = ref(false)
  const transferError = ref<string | null>(null)

  const generateId = (): string => crypto.randomUUID()

  const pushClipboardTextToPeer = async (): Promise<void> => {
    try {
      isTransferring.value = true
      transferError.value = null

      const text = await window.electron.ipcRenderer.invoke('clipboard:readText')
      if (!text) {
        throw new Error('Clipboard is empty')
      }

      if (new Blob([text]).size > 1024 * 1024) {
        throw new Error('Clipboard text too large (>1MB)')
      }

      const msg: P2PMessage = {
        type: 'clipboard-push',
        payload: {
          id: generateId(),
          text
        }
      }

      webRtcService.sendData('clipboard', JSON.stringify(msg))
    } catch (error: unknown) {
      transferError.value = getErrorMessage(error)
      console.error('[useClipboardChannel] Push error:', error)
    } finally {
      isTransferring.value = false
    }
  }

  const requestClipboardTextFromPeer = (): void => {
    try {
      isTransferring.value = true
      transferError.value = null

      const msg: P2PMessage = {
        type: 'clipboard-request',
        payload: {
          id: generateId()
        }
      }

      webRtcService.sendData('clipboard', JSON.stringify(msg))

      setTimeout(() => {
        if (isTransferring.value) {
          isTransferring.value = false
          transferError.value = 'Timeout requesting clipboard from peer'
        }
      }, 10000)
    } catch (error: unknown) {
      transferError.value = getErrorMessage(error)
      isTransferring.value = false
      console.error('[useClipboardChannel] Request error:', error)
    }
  }

  const handleIncomingMessage = async (message: P2PMessage): Promise<void> => {
    if (message.type === 'clipboard-push') {
      try {
        if (new Blob([message.payload.text]).size > 1024 * 1024) {
          const err: P2PMessage = {
            type: 'clipboard-error',
            payload: { id: message.payload.id, message: 'Payload > 1MB rejected.' }
          }

          webRtcService.sendData('clipboard', JSON.stringify(err))
          return
        }

        await window.electron.ipcRenderer.invoke('clipboard:writeText', message.payload.text)

        const res: P2PMessage = {
          type: 'clipboard-response',
          payload: { id: message.payload.id, text: 'OK' }
        }

        webRtcService.sendData('clipboard', JSON.stringify(res))
      } catch (error: unknown) {
        console.error('[useClipboardChannel] Error saving pushed text', error)
      }
    } else if (message.type === 'clipboard-request') {
      const text = await window.electron.ipcRenderer.invoke('clipboard:readText')
      const res: P2PMessage = {
        type: 'clipboard-response',
        payload: {
          id: message.payload.id,
          text: text || ''
        }
      }

      webRtcService.sendData('clipboard', JSON.stringify(res))
    } else if (message.type === 'clipboard-response') {
      if (message.payload.text && message.payload.text !== 'OK') {
        await window.electron.ipcRenderer.invoke('clipboard:writeText', message.payload.text)
      }

      isTransferring.value = false
    } else if (message.type === 'clipboard-error') {
      transferError.value = message.payload.message
      isTransferring.value = false
    }
  }

  messageRouter.subscribe('clipboard', handleIncomingMessage)

  return {
    pushClipboardTextToPeer,
    requestClipboardTextFromPeer,
    isTransferring,
    transferError
  }
}
