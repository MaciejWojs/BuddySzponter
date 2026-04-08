// composables/webrtc/webRtcService.ts
export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null

  public chatChannel: RTCDataChannel | null = null
  public mouseChannel: RTCDataChannel | null = null
  public controlChannel: RTCDataChannel | null = null

  public onConnectionFailed?: () => void
  public onConnectionClosed?: () => void
  public onIceCandidateGenerated?: (candidate: RTCIceCandidate) => void
  public onDataChannelOpened?: () => void
  public onMessageReceived?: (data: string) => void
  public onRemoteStreamReceived?: (stream: MediaStream) => void

  private isIntentionallyClosing = false
  private iceCandidateQueue: RTCIceCandidateInit[] = []

  constructor() {
    //
  }

  public initialize(): void {
    this.isIntentionallyClosing = false
    this.iceCandidateQueue = []

    const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'
    const server = import.meta.env.VITE_ICE_SERVER
    const serverUser = import.meta.env.VITE_ICE_SERVER_USER || 'user'
    const serverPass = import.meta.env.VITE_ICE_SERVER_PASS || '1234'

    const config: RTCConfiguration = { iceServers: [] }

    if (isRemote && server) {
      config.iceServers = [
        { urls: `stun:${server}:3478` },
        { urls: `turn:${server}:3478`, username: serverUser, credential: serverPass },
        { urls: `turns:${server}:443`, username: serverUser, credential: serverPass },
        { urls: `turns:${server}:5349`, username: serverUser, credential: serverPass }
      ]
    } else {
      config.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]
    }

    this.peerConnection = new RTCPeerConnection(config)

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateGenerated) {
        this.onIceCandidateGenerated(event.candidate)
      }
    }

    this.peerConnection.ondatachannel = (event) => {
      console.log(`[WebRTCService] Gość odebrał DataChannel: ${event.channel.label}`)
      this.setupChannel(event.channel)
    }

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Otrzymano ścieżkę wideo/audio od partnera!')
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStreamReceived) this.onRemoteStreamReceived(event.streams[0])
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      if (state === 'failed' && !this.isIntentionallyClosing) {
        if (this.onConnectionFailed) this.onConnectionFailed()
      } else if (state === 'closed') {
        if (this.onConnectionClosed) this.onConnectionClosed()
      }
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState
      if ((iceState === 'disconnected' || iceState === 'failed') && !this.isIntentionallyClosing) {
        if (this.onConnectionFailed) this.onConnectionFailed()
      }
    }
  }

  public addLocalStream(stream: MediaStream): void {
    if (!this.peerConnection) throw new Error('Brak PeerConnection!')
    stream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, stream)
    })
  }

  private setupChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log(`[WebRTCService] Kanał OTWARTY: ${channel.label}`)
      if (channel.label === 'control-channel' && this.onDataChannelOpened) {
        this.onDataChannelOpened()
      }
    }

    channel.onmessage = (event) => {
      if (this.onMessageReceived) this.onMessageReceived(event.data)
    }

    channel.onclose = () => {
      console.log(`[WebRTCService] Kanał ZAMKNIĘTY: ${channel.label}`)
    }

    if (channel.label === 'chat-channel') this.chatChannel = channel
    else if (channel.label === 'mouse-channel') this.mouseChannel = channel
    else if (channel.label === 'control-channel') this.controlChannel = channel
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    if (!this.controlChannel) {
      const controlChannel = this.peerConnection.createDataChannel('control-channel', {
        ordered: true
      })
      this.setupChannel(controlChannel)

      const chatChannel = this.peerConnection.createDataChannel('chat-channel', { ordered: true })
      this.setupChannel(chatChannel)

      const mouseChannel = this.peerConnection.createDataChannel('mouse-channel', {
        ordered: false,
        maxRetransmits: 0
      })
      this.setupChannel(mouseChannel)
    }

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  public sendData(
    channelLabel: 'chat-channel' | 'mouse-channel' | 'control-channel',
    message: string
  ): void {
    let channel: RTCDataChannel | null = null
    if (channelLabel === 'chat-channel') channel = this.chatChannel
    else if (channelLabel === 'mouse-channel') channel = this.mouseChannel
    else if (channelLabel === 'control-channel') channel = this.controlChannel

    if (channel && channel.readyState === 'open') {
      channel.send(message)
    }
  }

  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    await this.flushIceQueue()
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    await this.flushIceQueue()
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return
    if (!this.peerConnection.remoteDescription) {
      console.log('[WebRTCService] Zbyt wczesny kandydat ICE. Dodaję do kolejki...')
      this.iceCandidateQueue.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.error('[WebRTCService] Błąd podczas dodawania kandydata ICE:', e)
    }
  }

  private async flushIceQueue(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return

    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift()
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error('[WebRTCService] Błąd podczas przetwarzania kolejki ICE:', e)
        }
      }
    }
  }

  public cleanup(): void {
    this.isIntentionallyClosing = true

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
      this.chatChannel = null
      this.mouseChannel = null
      this.controlChannel = null
    }

    if (this.onConnectionClosed) this.onConnectionClosed()
  }
}

export const webRtcService = new WebRTCService()
