// composables/webrtc/webRtcService.ts
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

interface CustomRTCCodecStats {
  id: string
  type: string
  mimeType: string
  sdpFmtpLine?: string
}

interface CustomRTCStreamStats {
  type: string
  kind: string
  codecId?: string
}

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

  // Recording
  private recorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private recordingStream: MediaStream | null = null
  public onRecordingReady?: (blob: Blob) => void

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
  private guestVideoSender: RTCRtpSender | null = null
  private guestMicSender: RTCRtpSender | null = null
  private guestSystemSender: RTCRtpSender | null = null
  private videoTransceiver: RTCRtpTransceiver | null = null
  private micTransceiver: RTCRtpTransceiver | null = null
  private systemTransceiver: RTCRtpTransceiver | null = null

  public initialize(isHost: boolean): void {
    this.isIntentionallyClosing = false
    this.isHost = isHost
    this.iceCandidateQueue = []
    this.remoteStream = new MediaStream()
    this.remoteTrackRoleByTrackId.clear()
    this.guestVideoSender = null
    this.guestMicSender = null
    this.guestSystemSender = null
    this.videoTransceiver = null
    this.micTransceiver = null
    this.systemTransceiver = null

    const server = import.meta.env.VITE_ICE_SERVER
    const serverUser = import.meta.env.VITE_ICE_SERVER_USER || 'test'
    const serverPass = import.meta.env.VITE_ICE_SERVER_PASS || '1234'

    const config: RTCConfiguration = {
      iceServers: []
    }

    if (server) {
      config.iceServers!.push(
        { urls: `turns:${server}:5349`, username: serverUser, credential: serverPass },
        { urls: `stun:${server}:3478` },
        { urls: `turn:${server}:3478`, username: serverUser, credential: serverPass }
      )
    } else {
      config.iceServers!.push({ urls: 'stun:stun.l.google.com:19302' })
    }

    this.peerConnection = new RTCPeerConnection(config)

    if (isHost) {
      this.videoTransceiver = this.peerConnection.addTransceiver('video', { direction: 'sendonly' })
      this.micTransceiver = this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' })
      this.systemTransceiver = this.peerConnection.addTransceiver('audio', {
        direction: 'sendonly'
      })

      const capabilities = RTCRtpReceiver.getCapabilities('video')

      if (capabilities?.codecs && this.videoTransceiver?.setCodecPreferences) {
        const codecs = capabilities.codecs
        const vp9 = codecs.filter((c) => c.mimeType.toLowerCase() === 'video/vp9')
        const h264 = codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264')
        const others = codecs.filter(
          (c) =>
            c.mimeType.toLowerCase() !== 'video/vp9' && c.mimeType.toLowerCase() !== 'video/h264'
        )

        const ordered = [...vp9, ...others, ...h264]
        this.videoTransceiver.setCodecPreferences(ordered)
      }
    }

    this.peerConnection.onicecandidate = (e): void => {
      if (e.candidate && this.onIceCandidateGenerated) this.onIceCandidateGenerated(e.candidate)
    }

    this.peerConnection.ondatachannel = (e): void => this.setupChannel(e.channel)

    this.peerConnection.ontrack = (event): void => {
      let hint = event.track.contentHint

      if (!hint || hint === '') {
        if (this.isHost) {
          if (event.transceiver === this.micTransceiver) hint = 'speech'
        } else {
          const audioTransceivers =
            this.peerConnection
              ?.getTransceivers()
              .filter((t) => t.receiver.track.kind === 'audio') || []
          if (event.transceiver === audioTransceivers[0]) hint = 'speech'
          else if (event.transceiver === audioTransceivers[1]) hint = 'music'
        }
        if (hint && event.track.kind === 'audio') {
          try {
            event.track.contentHint = hint
          } catch (e) {
            console.warn('[WebRTCService] Nie można ustawić contentHint dla ścieżki:', e)
          }
        }
      }

      const role: RemoteTrackRole =
        hint === 'speech' ? 'speech' : hint === 'music' ? 'music' : 'unknown'

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
      if (state === 'connected') {
        setTimeout(() => this.logActiveVideoCodec(), 1000)
      }
    }
  }

  public async logActiveVideoCodec(): Promise<void> {
    if (!this.peerConnection) return

    const stats = await this.peerConnection.getStats()

    const codecMap = new Map<string, string>()
    let activeCodec: string | null = null

    for (const report of stats.values()) {
      if (report.type === 'codec') {
        const codec = report as unknown as CustomRTCCodecStats
        codecMap.set(codec.id, `${codec.mimeType} (${codec.sdpFmtpLine || ''})`)
      }
    }

    for (const report of stats.values()) {
      if (report.type === 'outbound-rtp' || report.type === 'inbound-rtp') {
        const streamStats = report as unknown as CustomRTCStreamStats

        if (streamStats.kind === 'video' && streamStats.codecId) {
          activeCodec = codecMap.get(streamStats.codecId) || null
          break
        }
      }
    }

    console.log('[WebRTC] Active video codec:', activeCodec ?? 'UNKNOWN')
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
      if (!this.guestVideoSender && videoTrack) {
        this.guestVideoSender = this.peerConnection.addTrack(
          videoTrack,
          new MediaStream([videoTrack])
        )
      } else if (this.guestVideoSender) {
        this.guestVideoSender.replaceTrack(videoTrack).catch(console.error)
      }

      if (!this.guestMicSender && micTrack) {
        this.guestMicSender = this.peerConnection.addTrack(micTrack, new MediaStream([micTrack]))
      } else if (this.guestMicSender) {
        this.guestMicSender.replaceTrack(micTrack).catch(console.error)
      }

      if (!this.guestSystemSender && sysTrack) {
        this.guestSystemSender = this.peerConnection.addTrack(sysTrack, new MediaStream([sysTrack]))
      } else if (this.guestSystemSender) {
        this.guestSystemSender.replaceTrack(sysTrack).catch(console.error)
      }

      return
    }

    if (videoTrack && this.videoTransceiver) {
      const params = this.videoTransceiver.sender.getParameters()
      if (params) {
        const mutableParams = params as RTCRtpSendParameters & {
          degradationPreference?: RTCDegradationPreference
        }
        mutableParams.degradationPreference = 'maintain-resolution'
        this.videoTransceiver.sender.setParameters(mutableParams).catch(console.error)
      }
    }

    if (this.videoTransceiver)
      this.videoTransceiver.sender.replaceTrack(videoTrack).catch(console.error)
    if (this.micTransceiver) this.micTransceiver.sender.replaceTrack(micTrack).catch(console.error)
    if (this.systemTransceiver)
      this.systemTransceiver.sender.replaceTrack(sysTrack).catch(console.error)
  }

  private clearLocalSenders(peerConnection: RTCPeerConnection | null = this.peerConnection): void {
    if (!peerConnection) return

    peerConnection.getSenders().forEach((sender) => {
      if (sender.track) {
        sender
          .replaceTrack(null)
          .catch((e) => console.warn('[WebRTCService] Błąd replaceTrack(null):', e))
      }
    })
  }

  private setupChannel(channel: RTCDataChannel): void {
    const handleOpen = (): void => {
      if (channel.label === 'system-events' && this.onDataChannelOpened) {
        this.onDataChannelOpened()
      }
    }

    if (channel.readyState === 'open') {
      handleOpen()
    } else {
      channel.onopen = handleOpen
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

    if (!this.isHost) {
      const audioTransceivers = this.peerConnection!.getTransceivers().filter(
        (t) => t.receiver.track.kind === 'audio'
      )
      if (audioTransceivers[0])
        audioTransceivers[0].direction = policy.allowMicrophoneAudio ? 'sendrecv' : 'recvonly'
      if (audioTransceivers[1])
        audioTransceivers[1].direction = policy.allowSystemAudio ? 'sendrecv' : 'recvonly'
    }

    if (localStream) this.publishLocalStream(localStream, policy)

    const answer = await this.peerConnection!.createAnswer()
    await this.peerConnection!.setLocalDescription(answer)
    await this.flushIceQueue()
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
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.warn('[WebRTCService] Błąd podczas addIceCandidate:', e)
    }
  }

  private async flushIceQueue(): Promise<void> {
    while (this.iceCandidateQueue.length > 0) {
      const cand = this.iceCandidateQueue.shift()
      if (cand) {
        try {
          await this.peerConnection?.addIceCandidate(new RTCIceCandidate(cand))
        } catch (e) {
          console.warn('[WebRTCService] Błąd w flushIceQueue:', e)
        }
      }
    }
  }

  public getRemoteTrackRole(trackId: string): RemoteTrackRole | null {
    return this.remoteTrackRoleByTrackId.get(trackId) ?? null
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

  public startRecording(): void {
    if (!this.remoteStream) {
      console.warn('[WebRTCService] Brak remoteStream')
      return
    }

    const ctx = getAudioContext()
    void resumeAudioContext().catch(() => {})
    const dest = ctx.createMediaStreamDestination()

    this.remoteStream.getAudioTracks().forEach((track) => {
      const source = ctx.createMediaStreamSource(new MediaStream([track]))
      source.connect(dest)
    })

    this.recordingStream = new MediaStream([
      ...this.remoteStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ])

    this.recordedChunks = []

    try {
      this.recorder = new MediaRecorder(this.recordingStream, {
        mimeType: 'video/webm; codecs=vp8,opus'
      })
    } catch {
      this.recorder = new MediaRecorder(this.recordingStream)
    }

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data)
      }
    }

    this.recorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
      this.onRecordingReady?.(blob)
    }

    this.recorder.start(1000)
  }

  public stopRecording(): void {
    if (!this.recorder) return

    this.recorder.stop()
    this.recorder = null
  }

  public async setVideoQualityLimits(maxBitrateKbps?: number, maxFps?: number): Promise<boolean> {
    if (!this.peerConnection) return false

    const senders = this.peerConnection.getSenders()
    const videoSender = senders.find((s) => s.track?.kind === 'video')

    if (!videoSender) return false

    try {
      const params = videoSender.getParameters()

      params.degradationPreference = 'maintain-resolution'

      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }

      const encoding = params.encodings[0]

      if (maxBitrateKbps) {
        encoding.maxBitrate = maxBitrateKbps * 1000
      } else {
        delete encoding.maxBitrate
      }

      if (maxFps) {
        encoding.maxFramerate = maxFps
      } else {
        delete encoding.maxFramerate
      }

      encoding.scaleResolutionDownBy = 1

      encoding.priority = 'high'
      ;(encoding as RTCRtpEncodingParameters & { scalabilityMode?: string }).scalabilityMode =
        'L1T1'

      await videoSender.setParameters(params)
      return true
    } catch (error) {
      console.error('[WebRTC] Błąd podczas zmiany limitów wideo:', error)
      return false
    }
  }

  public cleanup(preserveIceQueue: boolean = false): void {
    const currentPeerConnection = this.peerConnection

    this.isIntentionallyClosing = true
    this.recordingStream?.getTracks().forEach((t) => t.stop())
    this.recordingStream = null
    this.recordedChunks = []

    this.clearLocalSenders(currentPeerConnection)
    currentPeerConnection?.close()

    this.peerConnection = null
    if (!preserveIceQueue) {
      this.iceCandidateQueue = []
    }
    this.chatChannel = null
    this.hidControlChannel = null
    this.systemEventsChannel = null
    this.metricsChannel = null
    this.videoTransceiver = null
    this.micTransceiver = null
    this.systemTransceiver = null
    this.guestVideoSender = null
    this.guestMicSender = null
    this.guestSystemSender = null
    this.remoteStream.getTracks().forEach((t) => t.stop())
    this.remoteStream = new MediaStream()
    this.remoteTrackRoleByTrackId.clear()
  }
}
export const webRtcService = new WebRTCService()
