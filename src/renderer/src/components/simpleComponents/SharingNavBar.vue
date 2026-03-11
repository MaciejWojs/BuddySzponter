<template>
  <div class="sharing-navbar-wrapper" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <nav
      v-show="!closed || hovered"
      class="sharing-navbar"
      :class="{ 'sharing-navbar--minimized': minimized }"
    >
      <template v-if="!minimized">
        <div class="sharing-navbar__left">
          <button
            class="sharing-navbar__btn"
            :title="pinned ? 'Odepnij' : 'Przypnij'"
            @click="togglePin"
          >
            <UIcon
              :name="pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
              class="sharing-navbar__icon"
            />
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
          <button class="sharing-navbar__btn" title="Minimalizuj" @click="minimized = true">
            <UIcon name="i-lucide-minus" class="sharing-navbar__icon" />
          </button>
          <button
            class="sharing-navbar__btn sharing-navbar__btn--close"
            title="Zamknij"
            @click="closed = true"
          >
            <UIcon name="i-lucide-x" class="sharing-navbar__icon" />
          </button>
        </div>
      </template>

      <template v-else>
        <button class="sharing-navbar__btn" title="Przywróć" @click="minimized = false">
          <UIcon name="i-lucide-users" class="sharing-navbar__icon" />
        </button>
      </template>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  hostName: string
}>()

const pinned = ref(false)
const minimized = ref(false)
const closed = ref(false)
const hovered = ref(false)

function togglePin(): void {
  pinned.value = !pinned.value
  window.api.window.setAlwaysOnTop(pinned.value)
}
</script>

<style scoped>
.sharing-navbar-wrapper {
  width: 33vw;
  min-height: 30px;
  margin: 0 auto;
}

.sharing-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-accent);
  border-radius: 8px;
  padding: 4px 10px;
  height: 30px;
  -webkit-app-region: drag;
  transition: opacity 0.2s;
}

.sharing-navbar__left,
.sharing-navbar__right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sharing-navbar__center {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: #000;
}

.sharing-navbar__name {
  white-space: nowrap;
}

.sharing-navbar__icon {
  width: 16px;
  height: 16px;
  color: #000;
}

.sharing-navbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
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

.sharing-navbar--minimized {
  width: auto;
  padding: 4px;
  border-radius: 50%;
  cursor: pointer;
}
</style>
