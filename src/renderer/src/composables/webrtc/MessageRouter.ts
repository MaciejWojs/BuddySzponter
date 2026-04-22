// src/renderer/services/webrtc/MessageRouter.ts
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'

// Zmieniliśmy `any` na konkretny typ P2PMessage
type MessageHandler = (message: P2PMessage) => void

class MessageRouter {
  private routes = new Map<string, MessageHandler[]>()

  public subscribe(channelLabel: string, handler: MessageHandler): void {
    if (!this.routes.has(channelLabel)) {
      this.routes.set(channelLabel, [])
    }
    this.routes.get(channelLabel)!.push(handler)
  }

  public route(channelLabel: string, rawData: string): void {
    try {
      // Rzutujemy sparsowany JSON na nasz bezpieczny interfejs
      const message = JSON.parse(rawData) as P2PMessage
      const handlers = this.routes.get(channelLabel) || []

      handlers.forEach((handler) => handler(message))
    } catch (error) {
      console.error(`[MessageRouter] Błąd parsowania wiadomości na kanale ${channelLabel}:`, error)
    }
  }
}

export const messageRouter = new MessageRouter()
