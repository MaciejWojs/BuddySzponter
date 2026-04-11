// composables/webrtc/webRtcService.ts
export type DataChannelLabel = 'chat-channel' | 'hid-control' | 'system-events' | 'metrics'
export type ConnectionMetrics = {
  rttMs: number | null
  cpuLoadPct: number | null
  timestamp: number
}

export type LocalTrackPolicy = {
  allowVideo: boolean
  allowSystemAudio: boolean
  allowMicrophoneAudio: boolean
  allowUnclassifiedAudio: boolean
}

export const hostTrackPolicy: LocalTrackPolicy = {
  allowVideo: true,
  allowSystemAudio: true,
  allowMicrophoneAudio: true,
  allowUnclassifiedAudio: true
}

export const guestTrackPolicy: LocalTrackPolicy = {
  allowVideo: false,
  allowSystemAudio: false,
  allowMicrophoneAudio: true,
  allowUnclassifiedAudio: true
}

export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null

  public chatChannel: RTCDataChannel | null = null
  public hidControlChannel: RTCDataChannel | null = null
  public systemEventsChannel: RTCDataChannel | null = null
  public metricsChannel: RTCDataChannel | null = null

  public onConnectionFailed?: () => void
  public onConnectionClosed?: () => void
  public onIceCandidateGenerated?: (candidate: RTCIceCandidate) => void
  public onDataChannelOpened?: () => void
  public onMessageReceived?: (data: string, channelLabel: string) => void
  public onRemoteStreamReceived?: (stream: MediaStream) => void

  private isIntentionallyClosing = false
  private iceCandidateQueue: RTCIceCandidateInit[] = []
  private localSenders: RTCRtpSender[] = []
  private remoteStream: MediaStream = new MediaStream()

  constructor() {
    //
  }

  public initialize(): void {
    this.isIntentionallyClosing = false
    this.iceCandidateQueue = []
    this.remoteStream = new MediaStream() // Inicjalizacja pustego strumienia odbiorczego

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
      console.log(`[WebRTCService] Otrzymano ścieżkę typu: ${event.track.kind}`)

      if (event.track.kind === 'audio' && !event.track.contentHint) {
        const audioTracksSoFar = this.remoteStream.getAudioTracks()
        if (audioTracksSoFar.length === 0) {
          event.track.contentHint = 'speech'
        } else if (audioTracksSoFar.length === 1) {
          event.track.contentHint = 'music'
        }
      }

      const trackExists = this.remoteStream.getTracks().some((t) => t.id === event.track.id)
      if (!trackExists) {
        this.remoteStream.addTrack(event.track)
      }

      const newReactiveStream = new MediaStream(this.remoteStream.getTracks())
      this.remoteStream = newReactiveStream

      if (this.onRemoteStreamReceived) {
        this.onRemoteStreamReceived(this.remoteStream)
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

  public publishLocalStream(stream: MediaStream, policy: LocalTrackPolicy = hostTrackPolicy): void {
    if (!this.peerConnection) throw new Error('Brak PeerConnection!')

    const currentSenders = this.peerConnection.getSenders()

    stream.getTracks().forEach((track) => {
      if (!this.shouldPublishTrack(track, policy)) {
        return
      }

      const isAlreadySending = currentSenders.some(
        (sender) => sender.track && sender.track.id === track.id
      )

      if (!isAlreadySending) {
        this.peerConnection?.addTrack(track, stream)
      }
    })
  }

  private clearLocalSenders(): void {
    if (!this.peerConnection || this.localSenders.length === 0) return

    this.localSenders.forEach((sender) => {
      try {
        if (this.peerConnection) {
          this.peerConnection.removeTrack(sender)
        }
      } catch (e) {
        console.warn('[WebRTCService] Nie udało się usunąć sendera:', e)
      }
    })

    this.localSenders = []

    // FIX: Wyłączanie nieaktywnych transceiverów
    this.peerConnection.getTransceivers().forEach((t) => {
      if (t.direction === 'sendonly' || t.direction === 'sendrecv') {
        t.direction = 'inactive'
      }
    })
  }

  private shouldPublishTrack(track: MediaStreamTrack, policy: LocalTrackPolicy): boolean {
    if (track.kind === 'video') {
      return policy.allowVideo
    }

    if (track.kind !== 'audio') {
      return false
    }

    const hint = track.contentHint
    if (hint === 'music') return policy.allowSystemAudio
    if (hint === 'speech') return policy.allowMicrophoneAudio

    return policy.allowUnclassifiedAudio
  }

  private setupChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log(`[WebRTCService] Kanał OTWARTY: ${channel.label}`)
      if (channel.label === 'system-events' && this.onDataChannelOpened) {
        this.onDataChannelOpened()
      }
    }

    channel.onmessage = (event) => {
      if (this.onMessageReceived) this.onMessageReceived(event.data, channel.label)
    }

    channel.onclose = () => {
      console.log(`[WebRTCService] Kanał ZAMKNIĘTY: ${channel.label}`)
    }

    if (channel.label === 'chat-channel') this.chatChannel = channel
    else if (channel.label === 'hid-control') this.hidControlChannel = channel
    else if (channel.label === 'system-events') this.systemEventsChannel = channel
    else if (channel.label === 'metrics') this.metricsChannel = channel
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Brak PeerConnection')

    if (!this.systemEventsChannel) {
      const hidControlChannel = this.peerConnection.createDataChannel('hid-control', {
        ordered: true,
        maxRetransmits: 0
      })
      this.setupChannel(hidControlChannel)

      const systemEventsChannel = this.peerConnection.createDataChannel('system-events', {
        ordered: true
      })
      this.setupChannel(systemEventsChannel)

      const chatChannel = this.peerConnection.createDataChannel('chat-channel', { ordered: true })
      this.setupChannel(chatChannel)

      const metricsChannel = this.peerConnection.createDataChannel('metrics', {
        ordered: false
      })
      this.setupChannel(metricsChannel)
    }

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  public sendData(channelLabel: DataChannelLabel, message: string): void {
    let channel: RTCDataChannel | null = null
    if (channelLabel === 'chat-channel') channel = this.chatChannel
    else if (channelLabel === 'hid-control') channel = this.hidControlChannel
    else if (channelLabel === 'system-events') channel = this.systemEventsChannel
    else if (channelLabel === 'metrics') channel = this.metricsChannel

    if (channel && channel.readyState === 'open') {
      channel.send(message)
    }
  }

  public async collectLocalMetrics(): Promise<ConnectionMetrics> {
    const metrics: ConnectionMetrics = {
      rttMs: null,
      cpuLoadPct: null,
      timestamp: Date.now()
    }

    if (!this.peerConnection) {
      return metrics
    }

    try {
      const stats = await this.peerConnection.getStats()

      for (const report of stats.values()) {
        if (report.type !== 'candidate-pair') continue

        const candidatePair = report as RTCIceCandidatePairStats
        if (
          candidatePair.state === 'succeeded' &&
          typeof candidatePair.currentRoundTripTime === 'number'
        ) {
          metrics.rttMs = Math.round(candidatePair.currentRoundTripTime * 1000)
          break
        }
      }

      const probeStart = performance.now()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const lagMs = performance.now() - probeStart
      metrics.cpuLoadPct = Math.max(0, Math.min(100, Math.round((lagMs / 16.67) * 100)))
    } catch (e) {
      console.error('[WebRTCService] Błąd zbierania metrics:', e)
    }

    return metrics
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

    this.clearLocalSenders()

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
      this.chatChannel = null
      this.hidControlChannel = null
      this.systemEventsChannel = null
      this.metricsChannel = null
    }

    if (this.onConnectionClosed) this.onConnectionClosed()

    // Zwalnianie strumienia odbiorczego z pamięci
    this.remoteStream.getTracks().forEach((track) => this.remoteStream.removeTrack(track))
  }
}

export const webRtcService = new WebRTCService()
