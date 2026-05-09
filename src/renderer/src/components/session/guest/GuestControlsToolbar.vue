<template>
  <div class="flex flex-wrap items-center gap-2 px-3 py-2">
    <GuestMicMuteButton :muted="microphoneMuted" @toggle="$emit('toggleMic')" />

    <GuestVolumeSlider
      label="Mikro"
      :model-value="localMicrophoneVolume"
      @update:model-value="$emit('updateMicVolume', $event)"
    />

    <GuestVolumeSlider
      label="System"
      :model-value="remoteSystemVolume"
      @update:model-value="$emit('updateSysVolume', $event)"
    />

    <GuestChatToggleButton
      :active="chatVisible"
      :has-unread="chatHasUnread"
      @toggle="$emit('toggleChat')"
    />

    <GuestDisconnectButton @disconnect="$emit('disconnect')" />
  </div>
</template>

<script setup lang="ts">
import GuestMicMuteButton from '@renderer/components/session/guest/GuestMicMuteButton.vue'
import GuestVolumeSlider from '@renderer/components/session/guest/GuestVolumeSlider.vue'
import GuestChatToggleButton from '@renderer/components/session/guest/GuestChatToggleButton.vue'
import GuestDisconnectButton from '@renderer/components/session/guest/GuestDisconnectButton.vue'

defineProps<{
  microphoneMuted: boolean
  localMicrophoneVolume: number
  remoteSystemVolume: number
  chatVisible: boolean
  chatHasUnread: boolean
}>()

defineEmits<{
  toggleMic: []
  updateMicVolume: [value: number]
  updateSysVolume: [value: number]
  toggleChat: []
  disconnect: []
}>()
</script>
