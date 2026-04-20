<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { SessionStore } from '@renderer/stores/sessionStore'
import SelectMicrophoneS from '../simple/SelectMicrophoneS.vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const sessionStore = SessionStore()
const webRtcStore = useWebRtcStore()
const { selectedMicrophoneDeviceId, availableMicrophones } = storeToRefs(sessionStore)

const syncMicMuteStateFromStream = (stream: MediaStream | null): void => {
  if (!stream) {
    return
  }

  const micTrack =
    stream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
    stream.getAudioTracks()[0] ??
    null

  if (!micTrack) {
    return
  }
}

const handleSelectedMicrophoneChange = async (): Promise<void> => {
  if (sessionStore.isCapturing) {
    await sessionStore.applySelectedMicrophone()
  }
  syncMicMuteStateFromStream(webRtcStore.localStream)
}
</script>

<template>
  <SelectMicrophoneS
    v-model="selectedMicrophoneDeviceId"
    :microphones="availableMicrophones"
    @update:model-value="handleSelectedMicrophoneChange"
  />
</template>
