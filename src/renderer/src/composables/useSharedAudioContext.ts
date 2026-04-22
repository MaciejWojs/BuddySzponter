let sharedAudioContext: AudioContext | null = null
let resumeInFlight: Promise<void> | null = null

const resolveAudioContextCtor = (): typeof AudioContext => {
  const webkitContextCtor = (
    globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext

  const contextCtor = globalThis.AudioContext || webkitContextCtor
  if (!contextCtor) {
    throw new Error('Web Audio API is not available in this environment.')
  }

  return contextCtor
}

export const getAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    const AudioContextCtor = resolveAudioContextCtor()
    sharedAudioContext = new AudioContextCtor()
  }

  return sharedAudioContext
}

export const resumeAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext()
  if (ctx.state === 'running') return

  if (!resumeInFlight) {
    resumeInFlight = ctx.resume().finally(() => {
      resumeInFlight = null
    })
  }

  await resumeInFlight
}
