<template>
  <section class="border border-[#444] rounded-lg bg-[#1a1a1a] p-4 shrink-0 flex flex-col gap-2">
    <div>
      <h3 class="m-0 text-sm font-bold text-emerald-400">Test czatu P2P (chat-channel)</h3>
      <p class="m-0 mt-1 text-xs text-gray-500">
        Nadawaj po aktywnym połączeniu WebRTC; nick z sesji lub z nazwy urządzenia.
      </p>
    </div>
    <ChatPanel class="h-96 w-full" />
  </section>
</template>

<script setup lang="ts">
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'
</script>
