export class SystemAudioService {
  async capture(): Promise<MediaStream | null> {
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: true
          } as MediaTrackConstraints
        })
      } catch {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
      }

      stream.getVideoTracks().forEach((t) => t.stop())

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) audioTrack.contentHint = 'music'

      return new MediaStream(audioTrack ? [audioTrack] : [])
    } catch {
      return null
    }
  }
}

export const systemAudioService = new SystemAudioService()
