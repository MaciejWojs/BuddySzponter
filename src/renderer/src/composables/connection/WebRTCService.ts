// composables/webrtc/webRtcService.ts
export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null

  public systemChannel: RTCDataChannel | null = null
  public mouseChannel: RTCDataChannel | null = null

  // Callbacki dla Store'a
  public onIceCandidateGenerated?: (candidate: RTCIceCandidate) => void
  public onDataChannelOpened?: () => void
  public onMessageReceived?: (data: string) => void
  public onRemoteStreamReceived?: (stream: MediaStream) => void

  constructor() {
    //
  }

  public initialize(): void {
    const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'
    const serversJson = import.meta.env.VITE_ICE_SERVERS

    const config: RTCConfiguration = {
      iceServers: isRemote && serversJson ? JSON.parse(serversJson) : []
    }

    console.log(`[WebRTC] Inicjalizacja w trybie: ${isRemote ? 'REMOTE' : 'LOCAL'}`)

    this.peerConnection = new RTCPeerConnection(config)

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateGenerated) {
        this.onIceCandidateGenerated(event.candidate)
      }
    }

    // --- TYLKO DLA GOŚCIA: Odbiera kanały, które Host dołącza do oferty ---
    this.peerConnection.ondatachannel = (event) => {
      console.log(`[WebRTCService] Gość odebrał DataChannel: ${event.channel.label}`)
      this.setupChannel(event.channel)
    }

    // --- NOWE: Odbieranie wideo/audio od partnera ---
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Otrzymano ścieżkę wideo/audio od partnera (ontrack)!')
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStreamReceived) {
          this.onRemoteStreamReceived(event.streams[0])
        }
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTCService] Stan połączenia P2P:', this.peerConnection?.connectionState)
    }
  }

  public addLocalStream(stream: MediaStream): void {
    if (!this.peerConnection) {
      throw new Error('Brak PeerConnection! Wywołaj initialize() przed addLocalStream()')
    }

    stream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, stream)
    })
    console.log('[WebRTCService] Dodano lokalny strumień wideo do PeerConnection.')
  }

  // --- UNIWERSALNA FUNKCJA PODPINANIA KANAŁÓW ---
  private setupChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log(`[WebRTCService] Kanał OTWARTY: ${channel.label}`)
      if (channel.label === 'system-channel' && this.onDataChannelOpened) {
        this.onDataChannelOpened()
      }
    }

    channel.onmessage = (event) => {
      if (this.onMessageReceived) this.onMessageReceived(event.data)
    }

    channel.onclose = () => {
      console.log(`[WebRTCService] Kanał ZAMKNIĘTY: ${channel.label}`)
    }

    if (channel.label === 'system-channel') {
      this.systemChannel = channel
    } else if (channel.label === 'mouse-channel') {
      this.mouseChannel = channel
    }
  }

  // --- TYLKO DLA HOSTA: Tworzy obydwa kanały ZANIM stworzy ofertę ---
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    const sysChannel = this.peerConnection.createDataChannel('system-channel', {
      ordered: true
    })
    this.setupChannel(sysChannel)

    const mouseChannel = this.peerConnection.createDataChannel('mouse-channel', {
      ordered: false,
      maxRetransmits: 0
    })
    this.setupChannel(mouseChannel)

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  public sendData(channelLabel: 'system-channel' | 'mouse-channel', message: string): void {
    const channel = channelLabel === 'system-channel' ? this.systemChannel : this.mouseChannel

    if (channel && channel.readyState === 'open') {
      channel.send(message)
    } else {
      console.warn(`[WebRTCService] Kanał ${channelLabel} nie jest otwarty.`)
    }
  }

  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  public cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
      this.systemChannel = null
      this.mouseChannel = null
    }
  }
}

export const webRtcService = new WebRTCService()
