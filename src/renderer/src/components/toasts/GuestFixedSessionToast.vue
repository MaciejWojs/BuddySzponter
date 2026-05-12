<script setup lang="ts">
import { computed } from 'vue'
import { useGuestFixedSessionToast } from '@renderer/composables/guestFixedSessionToast'

const { visible, messageText, durationMs, replayId } = useGuestFixedSessionToast()

const rootStyle = computed(() => ({
  '--guest-fixed-toast-ms': `${durationMs.value}ms`
}))
</script>

<template>
  <Teleport to="body">
    <Transition name="guest-fixed-toast-fade">
      <aside
        v-if="visible"
        class="guest-fixed-toast"
        :style="rootStyle"
        role="status"
        aria-live="polite"
      >
        <p class="guest-fixed-toast__text">
          {{ messageText }}
        </p>
        <div class="guest-fixed-toast__timer" aria-hidden="true">
          <div :key="replayId" class="guest-fixed-toast__timer-fill" />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guest-fixed-toast {
  --guest-fixed-toast-ms: 3000ms;
  position: fixed;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  left: auto;
  top: auto;
  z-index: 22000;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
  min-width: min(260px, calc(100vw - 32px));
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 10px 12px 14px;
  margin: 0;
  box-sizing: border-box;
  border-radius: 10px;
  background: #c792ea;
  box-shadow: 0 8px 28px rgba(24, 16, 40, 0.35);
  pointer-events: none;
}

.guest-fixed-toast__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  align-self: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  color: #1a1528;
  word-break: break-word;
}

.guest-fixed-toast__timer {
  position: relative;
  flex-shrink: 0;
  width: 10px;
  min-height: 48px;
  align-self: stretch;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.35);
  overflow: hidden;
}

.guest-fixed-toast__timer-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  border-radius: 4px;
  background: #ffffff;
  transform-origin: bottom center;
  animation: guest-fixed-toast-drain var(--guest-fixed-toast-ms) linear forwards;
}

@keyframes guest-fixed-toast-drain {
  from {
    transform: scaleY(1);
  }
  to {
    transform: scaleY(0);
  }
}

.guest-fixed-toast-fade-enter-active,
.guest-fixed-toast-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.guest-fixed-toast-fade-enter-from,
.guest-fixed-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
