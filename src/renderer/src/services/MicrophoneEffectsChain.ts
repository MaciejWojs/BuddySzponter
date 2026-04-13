import * as Tone from 'tone'

type VoicePresetName = 'none' | 'studio' | 'high' | 'demon' | 'robot' | 'radio'

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
  private toneInputNode: Tone.Gain | null
  private toneOutputNode: Tone.Gain | null
  private pitchShiftNode: Tone.PitchShift | null
  private bitCrusherNode: Tone.BitCrusher | null
  private reverbNode: Tone.Reverb | null
  private chebyshevNode: Tone.Chebyshev | null
  private gainNode: GainNode | null
  private destinationNode: MediaStreamAudioDestinationNode | null
  private analyserNode: AnalyserNode | null

  public constructor(
    private readonly audioContext: AudioContext,
    private readonly rawStream: MediaStream
  ) {
    this.sourceNode = this.audioContext.createMediaStreamSource(this.rawStream)
    Tone.setContext(this.audioContext)

    this.gateNode = this.audioContext.createGain()
    this.gateAnalyserNode = this.audioContext.createAnalyser()
    this.highPassEQNode = this.audioContext.createBiquadFilter()
    this.deMudEQNode = this.audioContext.createBiquadFilter()
    this.lowShelfEQNode = this.audioContext.createBiquadFilter()
    this.presenceEQNode = this.audioContext.createBiquadFilter()
    this.highShelfEQNode = this.audioContext.createBiquadFilter()
    this.limiterNode = this.audioContext.createDynamicsCompressor()
    this.toneInputNode = new Tone.Gain(1)
    this.toneOutputNode = new Tone.Gain(1)
    this.pitchShiftNode = new Tone.PitchShift({ pitch: 0, wet: 0 })
    this.bitCrusherNode = new Tone.BitCrusher({ bits: 8 })
    this.bitCrusherNode.wet.value = 0
    this.reverbNode = new Tone.Reverb({ decay: 1.2, preDelay: 0.01, wet: 0 })
    this.chebyshevNode = new Tone.Chebyshev({ order: 1, wet: 0 })
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
    this.highShelfEQNode.connect(this.toneInputNode.input)
    this.toneInputNode.chain(
      this.pitchShiftNode,
      this.bitCrusherNode,
      this.reverbNode,
      this.chebyshevNode,
      this.toneOutputNode
    )
    this.toneOutputNode.output.connect(this.limiterNode)
    this.limiterNode.connect(this.gainNode)
    this.gainNode.connect(this.analyserNode)
    this.gainNode.connect(this.destinationNode)

    this.setLimiter(true)
    this.setVolume(1)
    this.setVoicePreset('none')
  }

  private smoothSetParam(
    param: AudioParam,
    value: number,
    transitionSeconds = 0.03,
    fromCurrent = true
  ): void {
    const now = this.audioContext.currentTime
    if (fromCurrent) {
      param.cancelScheduledValues(now)
      param.setValueAtTime(param.value, now)
    }
    param.linearRampToValueAtTime(value, now + transitionSeconds)
  }

  private resetToneEffects(): void {
    if (!this.pitchShiftNode || !this.bitCrusherNode || !this.reverbNode || !this.chebyshevNode)
      return

    this.pitchShiftNode.pitch = 0
    this.pitchShiftNode.wet.rampTo(0, 0.03)

    this.bitCrusherNode.set({ bits: 8 })
    this.bitCrusherNode.wet.rampTo(0, 0.03)

    this.reverbNode.decay = 1.2
    this.reverbNode.preDelay = 0.01
    this.reverbNode.wet.rampTo(0, 0.03)

    this.chebyshevNode.order = 1
    this.chebyshevNode.wet.rampTo(0, 0.03)

    if (this.highPassEQNode) {
      this.smoothSetParam(this.highPassEQNode.frequency, 80)
    }

    this.toneOutputNode?.gain.rampTo(1, 0.03)
  }

  public setVoicePreset(presetName: string): void {
    if (!this.limiterNode || !this.pitchShiftNode || !this.bitCrusherNode || !this.reverbNode)
      return

    const preset = (presetName as VoicePresetName) || 'none'
    this.resetToneEffects()

    switch (preset) {
      case 'studio':
        this.limiterNode.threshold.value = -20
        this.limiterNode.knee.value = 24
        this.limiterNode.ratio.value = 2.2
        this.limiterNode.attack.value = 0.006
        this.limiterNode.release.value = 0.14
        break

      case 'high':
        this.pitchShiftNode.pitch = 7
        this.pitchShiftNode.wet.rampTo(1, 0.04)
        break

      case 'demon':
        this.pitchShiftNode.pitch = -5
        this.pitchShiftNode.wet.rampTo(1, 0.04)
        this.bitCrusherNode.set({ bits: 8 })
        this.bitCrusherNode.wet.rampTo(0.3, 0.04)
        break

      case 'robot':
        this.pitchShiftNode.pitch = -2
        this.pitchShiftNode.wet.rampTo(0.75, 0.04)
        this.bitCrusherNode.set({ bits: 4 })
        this.bitCrusherNode.wet.rampTo(0.55, 0.04)
        this.reverbNode.wet.rampTo(0.2, 0.04)
        this.toneOutputNode?.gain.rampTo(1.2, 0.05)
        break

      case 'radio':
        if (this.chebyshevNode) {
          this.chebyshevNode.order = 50
          this.chebyshevNode.wet.rampTo(1, 0.04)
        }
        if (this.highPassEQNode) {
          this.smoothSetParam(this.highPassEQNode.frequency, 400)
        }
        break

      case 'none':
      default:
        this.setLimiter(true)
        break
    }
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

    if (this.toneInputNode) {
      try {
        this.toneInputNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose tone input node')
      }
      this.toneInputNode = null
    }

    if (this.pitchShiftNode) {
      try {
        this.pitchShiftNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose pitch shift node')
      }
      this.pitchShiftNode = null
    }

    if (this.bitCrusherNode) {
      try {
        this.bitCrusherNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose bit crusher node')
      }
      this.bitCrusherNode = null
    }

    if (this.reverbNode) {
      try {
        this.reverbNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose reverb node')
      }
      this.reverbNode = null
    }

    if (this.chebyshevNode) {
      try {
        this.chebyshevNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose chebyshev node')
      }
      this.chebyshevNode = null
    }

    if (this.toneOutputNode) {
      try {
        this.toneOutputNode.dispose()
      } catch {
        console.warn('[MicrophoneEffectsChain] Failed to dispose tone output node')
      }
      this.toneOutputNode = null
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
