// src/renderer/services/video/RecordingService.ts
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { useLogStore } from '@renderer/stores/devStores/logStore'

export class RecordingService {
  private _isRecording = false

  constructor() {
    webRtcService.onRecordingReady = async (blob) => {
      const logStore = useLogStore()
      try {
        const buffer = await blob.arrayBuffer()
        await window.recorder.saveFile(buffer)
        logStore.addLog('INFO', 'Nagranie zapisane pomyślnie.', 'api')
      } catch (e) {
        logStore.addLog('ERROR', `Błąd zapisu nagrania: ${e}`, 'api')
      }
    }
  }

  public get isRecording(): boolean {
    return this._isRecording
  }

  public startRecording(remoteStream: MediaStream | null): void {
    const logStore = useLogStore()
    if (!remoteStream) {
      logStore.addLog('WARN', 'Brak strumienia zdalnego do nagrywania', 'api')
      return
    }

    webRtcService.startRecording()
    this._isRecording = true
    logStore.addLog('INFO', 'Rozpoczęto nagrywanie', 'api')
  }

  public stopRecording(): void {
    if (!this._isRecording) return

    webRtcService.stopRecording()
    this._isRecording = false
    const logStore = useLogStore()
    logStore.addLog('INFO', 'Zakończono nagrywanie, przetwarzanie pliku...', 'api')
  }
}

export const recordingService = new RecordingService()
