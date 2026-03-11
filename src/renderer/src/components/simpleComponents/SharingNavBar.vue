<template>
  <nav class="sharing-navbar">
    <div class="sharing-navbar__left">
      <button
        class="sharing-navbar__btn"
        :title="pinned ? 'Odepnij' : 'Przypnij'"
        @click="togglePin"
      >
        <UIcon :name="pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'" class="sharing-navbar__icon" />
      </button>
      <button class="sharing-navbar__btn" title="Połączenie">
        <UIcon name="i-lucide-wifi" class="sharing-navbar__icon" />
      </button>
    </div>

    <div class="sharing-navbar__center">
      <UIcon name="i-lucide-users" class="sharing-navbar__icon" />
      <span class="sharing-navbar__name">{{ hostName }}</span>
    </div>

    <div class="sharing-navbar__right">
      <button class="sharing-navbar__btn" title="Minimalizuj" @click="handleMinimize">
        <UIcon name="i-lucide-minus" class="sharing-navbar__icon" />
      </button>
      <button class="sharing-navbar__btn" title="Maksymalizuj" @click="handleMaximize">
        <UIcon name="i-lucide-maximize-2" class="sharing-navbar__icon" />
      </button>
      <button
        class="sharing-navbar__btn sharing-navbar__btn--close"
        title="Zamknij"
        @click="handleClose"
      >
        <UIcon name="i-lucide-x" class="sharing-navbar__icon" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  hostName: string
}>()

const pinned = ref(false)

function togglePin(): void {
  pinned.value = !pinned.value
  window.api.window.setAlwaysOnTop(pinned.value)
}

function handleMinimize(): void {
  window.api.window.minimize()
}

function handleMaximize(): void {
  window.api.window.maximize()
}

function handleClose(): void {
  window.api.window.close()
}
</script>

<style scoped>
.sharing-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-accent);
  border-radius: 12px;
  padding: 6px 12px;
  -webkit-app-region: drag;
}

.sharing-navbar__left,
.sharing-navbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sharing-navbar__center {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #000;
}

.sharing-navbar__name {
  white-space: nowrap;
}

.sharing-navbar__icon {
  width: 20px;
  height: 20px;
  color: #000;
}

.sharing-navbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.15s;
  -webkit-app-region: no-drag;
}

.sharing-navbar__btn:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

.sharing-navbar__btn--close:hover {
  background-color: rgba(220, 38, 38, 0.8);
}

.sharing-navbar__btn--close:hover .sharing-navbar__icon {
  color: #fff;
}
</style>
