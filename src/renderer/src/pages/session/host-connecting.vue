<script setup lang="ts">
import MenuAppShell from '@renderer/components/menu/MenuAppShell.vue'
import { useSocketStore } from '@renderer/stores/socketStore'

const socketStore = useSocketStore()
const { t } = useI18n()

const disconnecting = ref(false)

async function onDisconnect(): Promise<void> {
  if (disconnecting.value) return
  disconnecting.value = true
  try {
    await socketStore.disconnect(true)
  } finally {
    disconnecting.value = false
  }
}
</script>

<template>
  <MenuAppShell>
    <div class="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <div class="host-connecting-spinner" aria-hidden="true" />
      <h2 class="text-center text-2xl font-semibold text-white">
        {{ t('hostConnecting.title') }}
      </h2>
      <p class="max-w-md text-center text-sm text-neutral-400 leading-relaxed">
        {{ t('hostConnecting.hint') }}
      </p>
      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        :loading="disconnecting"
        @click="onDisconnect()"
      >
        {{ t('hostConnecting.disconnect') }}
      </UButton>
    </div>
  </MenuAppShell>
</template>

<style scoped>
.host-connecting-spinner {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #d0f224;
  animation: host-connecting-spin 0.8s linear infinite;
}

@keyframes host-connecting-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
