export class MicrophoneEffectsChain {
  private sourceNode: MediaStreamAudioSourceNode | null
  private gateNode: GainNode | null
  private gateAnalyserNode: AnalyserNode | null
  private highPassEQNode: BiquadFilterNode | null
  private deMudEQNode: BiquadFilterNode | null
  private lowShelfEQNode: BiquadFilterNode | null
  private presenceEQNode: BiquadFilterNode | null
  private highShelfEQNode: BiquadFilterNode | null
  private limiterNode: DynamicsCompressorNode | null
  private gainNode: GainNode | null
  private destinationNode: MediaStreamAudioDestinationNode | null
  private analyserNode: AnalyserNode | null

  public constructor(
    private readonly audioContext: AudioContext,
    private readonly rawStream: MediaStream
  ) {
    this.sourceNode = this.audioContext.createMediaStreamSource(this.rawStream)
    this.gateNode = this.audioContext.createGain()
    this.gateAnalyserNode = this.audioContext.createAnalyser()
    this.highPassEQNode = this.audioContext.createBiquadFilter()
    this.deMudEQNode = this.audioContext.createBiquadFilter()
    this.lowShelfEQNode = this.audioContext.createBiquadFilter()
    this.presenceEQNode = this.audioContext.createBiquadFilter()
    this.highShelfEQNode = this.audioContext.createBiquadFilter()
    this.limiterNode = this.audioContext.createDynamicsCompressor()
    this.gainNode = this.audioContext.createGain()
    this.destinationNode = this.audioContext.createMediaStreamDestination()
    this.analyserNode = this.audioContext.createAnalyser()

    this.gateNode.gain.value = 1
    this.gateAnalyserNode.fftSize = 1024
    this.gateAnalyserNode.smoothingTimeConstant = 0.1

    this.highPassEQNode.type = 'highpass'
    this.highPassEQNode.frequency.value = 80

    this.deMudEQNode.type = 'peaking'
    this.deMudEQNode.frequency.value = 200
    this.deMudEQNode.gain.value = -2
    this.deMudEQNode.Q.value = 1

    this.lowShelfEQNode.type = 'lowshelf'
    this.lowShelfEQNode.frequency.value = 150
    this.lowShelfEQNode.gain.value = 0

    this.presenceEQNode.type = 'peaking'
    this.presenceEQNode.frequency.value = 3000
    this.presenceEQNode.gain.value = 2
    this.presenceEQNode.Q.value = 1

    this.highShelfEQNode.type = 'highshelf'
    this.highShelfEQNode.frequency.value = 5000
    this.highShelfEQNode.gain.value = 3

    this.analyserNode.fftSize = 1024
    this.analyserNode.smoothingTimeConstant = 0.2

    this.sourceNode.connect(this.highPassEQNode)
    this.highPassEQNode.connect(this.gateAnalyserNode)
    this.highPassEQNode.connect(this.gateNode)
    this.gateNode.connect(this.deMudEQNode)
    this.deMudEQNode.connect(this.lowShelfEQNode)
    this.lowShelfEQNode.connect(this.presenceEQNode)
    this.presenceEQNode.connect(this.highShelfEQNode)
    this.highShelfEQNode.connect(this.limiterNode)
    this.limiterNode.connect(this.gainNode)
    this.gainNode.connect(this.analyserNode)
    this.gainNode.connect(this.destinationNode)

    this.setLimiter(true)
    this.setVolume(1)
  }

  public setLimiter(enabled: boolean): void {
    if (!this.limiterNode) return

    if (enabled) {
      this.limiterNode.threshold.value = -24
      this.limiterNode.knee.value = 20
      this.limiterNode.ratio.value = 3
      this.limiterNode.attack.value = 0.01
      this.limiterNode.release.value = 0.2
      return
    }

    this.limiterNode.threshold.value = 0
    this.limiterNode.knee.value = 0
    this.limiterNode.ratio.value = 1
    this.limiterNode.attack.value = 0.003
    this.limiterNode.release.value = 0.25
  }

  public setVolume(volume: number): void {
    if (!this.gainNode) return
    this.gainNode.gain.value = Math.max(0, Math.min(2, volume))
  }

  public setBassBoost(dbValue: number): void {
    if (!this.lowShelfEQNode) return
    this.lowShelfEQNode.gain.value = dbValue
  }

  public getGateAnalyserNode(): AnalyserNode | null {
    return this.gateAnalyserNode
  }

  public getGateTargetNode(): GainNode | null {
    return this.gateNode
  }

  public getFinalAnalyserNode(): AnalyserNode | null {
    return this.analyserNode
  }

  public getProcessedTrack(): MediaStreamTrack | null {
    return this.destinationNode?.stream.getAudioTracks()[0] ?? null
  }

  public getProcessedStream(): MediaStream | null {
    return this.destinationNode?.stream ?? null
  }

  public destroy(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect source node')
      }
      this.sourceNode = null
    }

    if (this.gateNode) {
      try {
        this.gateNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect gate node')
      }
      this.gateNode = null
    }

    if (this.gateAnalyserNode) {
      try {
        this.gateAnalyserNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect gate analyser node')
      }
      this.gateAnalyserNode = null
    }

    if (this.highPassEQNode) {
      try {
        this.highPassEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect high-pass node')
      }
      this.highPassEQNode = null
    }

    if (this.deMudEQNode) {
      try {
        this.deMudEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect de-mud node')
      }
      this.deMudEQNode = null
    }

    if (this.lowShelfEQNode) {
      try {
        this.lowShelfEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect low-shelf node')
      }
      this.lowShelfEQNode = null
    }

    if (this.presenceEQNode) {
      try {
        this.presenceEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect presence node')
      }
      this.presenceEQNode = null
    }

    if (this.highShelfEQNode) {
      try {
        this.highShelfEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect high-shelf node')
      }
      this.highShelfEQNode = null
    }

    if (this.limiterNode) {
      try {
        this.limiterNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect limiter node')
      }
      this.limiterNode = null
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect gain node')
      }
      this.gainNode = null
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect analyser node')
      }
      this.analyserNode = null
    }

    if (this.destinationNode) {
      try {
        this.destinationNode.disconnect()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to disconnect destination node')
      }
      this.destinationNode = null
    }
  }
}
