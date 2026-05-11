<script setup lang="ts">
import MenuAppShell from '@renderer/components/menu/MenuAppShell.vue'
import {
  getFileTransferDownloadDirectory,
  setFileTransferDownloadDirectory
} from '@renderer/composables/channels/FileTransferChannel'

const downloadPath = ref('')

onMounted(async () => {
  const saved = getFileTransferDownloadDirectory()
  if (saved) {
    downloadPath.value = saved
    return
  }
  if (window.api?.fileTransfer?.getDownloadsPath) {
    try {
      downloadPath.value = await window.api.fileTransfer.getDownloadsPath()
    } catch {
      downloadPath.value = ''
    }
  }
})

const pickFolder = async (): Promise<void> => {
  const picked = await window.api?.fileTransfer?.pickDirectory?.()
  if (picked) downloadPath.value = picked
}

const savePath = (): void => {
  const t = downloadPath.value.trim()
  if (!t) return
  setFileTransferDownloadDirectory(t)
}
</script>

<template>
  <MenuAppShell>
    <div class="settings-block">
      <label class="settings-label" for="p2p-download-path">{{
        $t('settingsPage.downloadPathLabel')
      }}</label>
      <p class="settings-hint">{{ $t('settingsPage.downloadPathHint') }}</p>
      <div class="settings-row">
        <input
          id="p2p-download-path"
          v-model="downloadPath"
          type="text"
          class="settings-input"
          spellcheck="false"
          autocomplete="off"
        />
        <button type="button" class="settings-btn settings-btn--ghost" @click="pickFolder">
          {{ $t('settingsPage.pickFolder') }}
        </button>
      </div>
      <button type="button" class="settings-btn settings-btn--primary" @click="savePath">
        {{ $t('settingsPage.save') }}
      </button>
    </div>
  </MenuAppShell>
</template>

<style scoped>
.settings-block {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 0 24px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.settings-label {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.settings-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.78;
  color: rgba(255, 255, 255, 0.88);
}

.settings-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.settings-input {
  flex: 1;
  min-width: 200px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #0d0035;
  color: #f4f4f8;
  font-size: 14px;
}

.settings-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.settings-btn--primary {
  align-self: flex-start;
  margin-top: 4px;
  color: #111827;
  background: #d0f224;
}

.settings-btn--primary:hover {
  filter: brightness(1.05);
}

.settings-btn--ghost {
  color: #f4f4f8;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.settings-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.18);
}
</style>
