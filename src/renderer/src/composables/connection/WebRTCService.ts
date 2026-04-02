// composables/webrtc/webRtcService.ts
export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null
  public dataChannel: RTCDataChannel | null = null

  // Callbacki dla Store'a
  public onIceCandidateGenerated?: (candidate: RTCIceCandidate) => void
  public onDataChannelOpened?: () => void
  public onMessageReceived?: (data: string) => void

  constructor() {
    //
  }

  public initialize(): void {
    this.peerConnection = new RTCPeerConnection()

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateGenerated) {
        this.onIceCandidateGenerated(event.candidate)
      }
    }

    // --- TYLKO DLA GOŚCIA: Odbiór kanału stworzonego przez Hosta ---
    this.peerConnection.ondatachannel = (event) => {
      console.log('[WebRTCService] Gość odebrał DataChannel!')
      this.setupDataChannel(event.channel)
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTCService] Stan połączenia P2P:', this.peerConnection?.connectionState)
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel

    this.dataChannel.onopen = () => {
      console.log('[WebRTCService] Kanał danych OTWARTY!')
      if (this.onDataChannelOpened) this.onDataChannelOpened()
    }

    this.dataChannel.onmessage = (event) => {
      if (this.onMessageReceived) this.onMessageReceived(event.data)
    }

    this.dataChannel.onclose = () => {
      console.log('[WebRTCService] Kanał danych ZAMKNIĘTY.')
    }
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    const channel = this.peerConnection.createDataChannel('main-channel')
    this.setupDataChannel(channel)

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  public sendData(message: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message)
    } else {
      console.warn('[WebRTCService] Nie można wysłać danych. Kanał zamknięty.')
    }
  }

  // 3. Akcje Gościa: Odbiera ofertę, tworzy odpowiedź
  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  // 4. Akcje Hosta: Odbiera odpowiedź od Gościa
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  // 5. Obie strony: Dodawanie kandydatów ICE z sieci
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  public cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }
}

export const webRtcService = new WebRTCService()
