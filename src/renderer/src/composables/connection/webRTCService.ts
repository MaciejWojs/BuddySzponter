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
}

export type RemoteTrackRole = 'speech' | 'music' | 'unknown'

export const hostTrackPolicy: LocalTrackPolicy = {
  allowVideo: true,
  allowSystemAudio: true,
  allowMicrophoneAudio: true
}
export const guestTrackPolicy: LocalTrackPolicy = {
  allowVideo: false,
  allowSystemAudio: false,
  allowMicrophoneAudio: true
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
  private isHost = false
  private iceCandidateQueue: RTCIceCandidateInit[] = []
  private remoteStream: MediaStream = new MediaStream()
  private remoteTrackRoleByTrackId = new Map<string, RemoteTrackRole>()
  private localSenders: RTCRtpSender[] = []
  private videoTc: RTCRtpTransceiver | null = null

  public initialize(isHost: boolean): void {
    this.isIntentionallyClosing = false
    this.isHost = isHost
    this.iceCandidateQueue = []
    this.remoteStream = new MediaStream()
    this.remoteTrackRoleByTrackId.clear()
    this.localSenders = []
    this.videoTc = null

    const server = import.meta.env.VITE_ICE_SERVER
    const serverUser = import.meta.env.VITE_ICE_SERVER_USER || 'user'
    const serverPass = import.meta.env.VITE_ICE_SERVER_PASS || '1234'

    const config: RTCConfiguration = {
      iceServers: []
    }

    if (server) {
      config.iceServers!.push(
        { urls: `stun:${server}:3478` },
        { urls: `turn:${server}:3478`, username: serverUser, credential: serverPass },
        { urls: `turns:${server}:443`, username: serverUser, credential: serverPass },
        { urls: `turns:${server}:5349`, username: serverUser, credential: serverPass }
      )
    } else {
      config.iceServers!.push({ urls: 'stun:stun.l.google.com:19302' })
    }

    this.peerConnection = new RTCPeerConnection(config)

    if (isHost) {
      this.videoTc = this.peerConnection.addTransceiver('video', { direction: 'sendrecv' }) // Rura 0
      this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' }) // Rura 1
      this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' }) // Rura 2

      const capabilities = RTCRtpReceiver.getCapabilities('video')
      const h264Codecs =
        capabilities?.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264') || []

      if (h264Codecs.length > 0 && this.videoTc.setCodecPreferences) {
        this.videoTc.setCodecPreferences(h264Codecs)
      }
    }

    this.peerConnection.onicecandidate = (e): void => {
      if (e.candidate && this.onIceCandidateGenerated) this.onIceCandidateGenerated(e.candidate)
    }

    this.peerConnection.ondatachannel = (e): void => this.setupChannel(e.channel)

    this.peerConnection.ontrack = (event): void => {
      const transceivers = this.peerConnection!.getTransceivers()
      const role: RemoteTrackRole =
        event.transceiver === transceivers[1]
          ? 'speech'
          : event.transceiver === transceivers[2]
            ? 'music'
            : 'unknown'

      // Rozpoznajemy track po numerze rury
      if (event.transceiver === transceivers[1]) event.track.contentHint = 'speech'
      if (event.transceiver === transceivers[2]) event.track.contentHint = 'music'

      this.remoteTrackRoleByTrackId.set(event.track.id, role)

      if (!this.remoteStream.getTracks().find((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track)
      }

      if (this.onRemoteStreamReceived) {
        this.onRemoteStreamReceived(new MediaStream(this.remoteStream.getTracks()))
      }
    }

    this.peerConnection.onconnectionstatechange = (): void => {
      const state = this.peerConnection?.connectionState
      if (state === 'failed' && !this.isIntentionallyClosing) this.onConnectionFailed?.()
      else if (state === 'closed') this.onConnectionClosed?.()
    }
  }

  public publishLocalStream(stream: MediaStream, policy: LocalTrackPolicy): void {
    if (!this.peerConnection) return

    const audioTracks = stream.getAudioTracks()
    const videoTrack = policy.allowVideo ? stream.getVideoTracks()[0] || null : null

    const hintedMic = audioTracks.find((t) => t.contentHint === 'speech') || null
    const hintedSys = audioTracks.find((t) => t.contentHint === 'music') || null
    const monoTrack = audioTracks.find((t) => t.getSettings().channelCount === 1) || null
    const stereoTrack = audioTracks.find((t) => t.getSettings().channelCount === 2) || null

    let micTrack: MediaStreamTrack | null = policy.allowMicrophoneAudio
      ? (hintedMic ?? monoTrack ?? null)
      : null
    let sysTrack: MediaStreamTrack | null = policy.allowSystemAudio
      ? (hintedSys ?? stereoTrack ?? null)
      : null

    if (policy.allowMicrophoneAudio && !policy.allowSystemAudio && !micTrack) {
      micTrack = audioTracks[0] || null
    }

    if (policy.allowSystemAudio && !policy.allowMicrophoneAudio && !sysTrack) {
      sysTrack = audioTracks[0] || null
    }

    if (policy.allowMicrophoneAudio && policy.allowSystemAudio) {
      if (!micTrack && !sysTrack && audioTracks.length === 1) {
        micTrack = audioTracks[0]
      }

      if (!micTrack && audioTracks.length > 0) {
        micTrack = audioTracks[0]
      }

      if (!sysTrack) {
        sysTrack = audioTracks.find((t) => t.id !== micTrack?.id) || null
      }
    }

    if (videoTrack) videoTrack.contentHint = 'detail'
    if (micTrack) micTrack.contentHint = 'speech'
    if (sysTrack) sysTrack.contentHint = 'music'

    if (!this.isHost) {
      this.clearLocalSenders()

      if (videoTrack) {
        this.localSenders.push(
          this.peerConnection.addTrack(videoTrack, new MediaStream([videoTrack]))
        )
      }

      if (micTrack) {
        this.localSenders.push(this.peerConnection.addTrack(micTrack, new MediaStream([micTrack])))
      }

      if (sysTrack) {
        this.localSenders.push(this.peerConnection.addTrack(sysTrack, new MediaStream([sysTrack])))
      }

      return
    }

    const tcs = this.peerConnection.getTransceivers()

    if (videoTrack && this.videoTc) {
      const params = this.videoTc.sender.getParameters()
      if (params) {
        const mutableParams = params as RTCRtpSendParameters & {
          degradationPreference?: RTCDegradationPreference
        }
        mutableParams.degradationPreference = 'maintain-framerate'
        this.videoTc.sender.setParameters(mutableParams).catch(console.error)
      }
    }

    // Wrzucamy tracki do odpowiednich rur. Jeśli nie ma tracka, rura wysyła ciszę/czarny ekran (lub nic)
    if (tcs[0]) tcs[0].sender.replaceTrack(videoTrack).catch(console.error)
    if (tcs[1]) tcs[1].sender.replaceTrack(micTrack).catch(console.error)
    if (tcs[2]) tcs[2].sender.replaceTrack(sysTrack).catch(console.error)
  }

  private clearLocalSenders(): void {
    if (!this.peerConnection) return

    // Profesjonalne "wyczyszczenie" rur bez ich niszczenia i wywoływania błędu "InvalidStateError"
    this.peerConnection.getSenders().forEach((sender) => {
      if (sender.track) {
        sender
          .replaceTrack(null)
          .catch((e) => console.warn('[WebRTCService] Błąd replaceTrack(null):', e))
      }
    })

    // Tylko gość u Ciebie przechowuje localSenders przy "addTrack" (fallback), więc go czyścimy
    this.localSenders = []
  }

  private setupChannel(channel: RTCDataChannel): void {
    channel.onopen = (): void => {
      if (channel.label === 'system-events' && this.onDataChannelOpened) this.onDataChannelOpened()
    }
    channel.onmessage = (e): void => {
      if (this.onMessageReceived) this.onMessageReceived(e.data, channel.label)
    }
    if (channel.label === 'chat-channel') this.chatChannel = channel
    else if (channel.label === 'hid-control') this.hidControlChannel = channel
    else if (channel.label === 'system-events') this.systemEventsChannel = channel
    else if (channel.label === 'metrics') this.metricsChannel = channel
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.systemEventsChannel) {
      this.setupChannel(
        this.peerConnection!.createDataChannel('hid-control', { ordered: true, maxRetransmits: 0 })
      )
      this.setupChannel(this.peerConnection!.createDataChannel('system-events', { ordered: true }))
      this.setupChannel(this.peerConnection!.createDataChannel('chat-channel', { ordered: true }))
      this.setupChannel(this.peerConnection!.createDataChannel('metrics', { ordered: false }))
    }
    const offer = await this.peerConnection!.createOffer()
    await this.peerConnection!.setLocalDescription(offer)
    return offer
  }

  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit,
    localStream: MediaStream | null,
    policy: LocalTrackPolicy
  ): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))

    if (localStream) this.publishLocalStream(localStream, policy)

    await this.flushIceQueue()
    const answer = await this.peerConnection!.createAnswer()
    await this.peerConnection!.setLocalDescription(answer)
    return answer
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer))
    await this.flushIceQueue()
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection?.remoteDescription) {
      this.iceCandidateQueue.push(candidate)
      return
    }
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  private async flushIceQueue(): Promise<void> {
    while (this.iceCandidateQueue.length > 0) {
      const cand = this.iceCandidateQueue.shift()
      if (cand) await this.peerConnection?.addIceCandidate(new RTCIceCandidate(cand))
    }
  }

  public getRemoteTrackRole(trackId: string): RemoteTrackRole | null {
    return this.remoteTrackRoleByTrackId.get(trackId) ?? null
  }

  // --- BRAKUJĄCE METODY PRZYWRÓCONE ---
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
    const metrics: ConnectionMetrics = { rttMs: null, cpuLoadPct: null, timestamp: Date.now() }
    if (!this.peerConnection) return metrics

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

  public cleanup(): void {
    this.isIntentionallyClosing = true
    this.peerConnection?.close()
    this.peerConnection = null
    this.chatChannel = null
    this.hidControlChannel = null
    this.systemEventsChannel = null
    this.metricsChannel = null
    this.videoTc = null
    this.remoteStream.getTracks().forEach((t) => t.stop())
    this.remoteTrackRoleByTrackId.clear()
    this.clearLocalSenders()
  }
}
export const webRtcService = new WebRTCService()
