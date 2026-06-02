import { getDisplayMediaLoopback } from '@renderer/services/audio/displayMediaLoopback'

export class SystemAudioService {
  async capture(): Promise<MediaStream | null> {
    try {
      const stream = await getDisplayMediaLoopback()

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
