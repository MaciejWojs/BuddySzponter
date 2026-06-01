<script setup lang="ts">
import { useSocketStore } from '@renderer/stores/socketStore'
import { useSessionStore } from '@renderer/stores/sessionStore'

const TOTAL_SECONDS = 25
const TOTAL_MS = TOTAL_SECONDS * 1000

const socketStore = useSocketStore()
const sessionStore = useSessionStore()

/** Pozostały czas w ms — od ściany zegara, nie z kroku setInterval (dokładne 25 s). */
const remainingMs = ref(TOTAL_MS)

let deadlineAt = 0
let tickId: ReturnType<typeof setInterval> | null = null

function clearTick(): void {
  if (tickId != null) {
    clearInterval(tickId)
    tickId = null
  }
}

function tick(): void {
  const ms = Math.max(0, deadlineAt - Date.now())
  remainingMs.value = ms
  if (ms <= 0) {
    clearTick()
    void sessionStore.handleRespond(false)
  }
}

function startCountdown(): void {
  clearTick()
  deadlineAt = Date.now() + TOTAL_MS
  remainingMs.value = TOTAL_MS
  tickId = setInterval(tick, 250)
}

const progressPercent = computed(() => (remainingMs.value / TOTAL_MS) * 100)

const displaySeconds = computed(() =>
  remainingMs.value > 0 ? Math.ceil(remainingMs.value / 1000) : 0
)
const timerMinutes = computed(() => Math.floor(displaySeconds.value / 60))
const timerSecondsPadded = computed(() => String(displaySeconds.value % 60).padStart(2, '0'))

watch(
  () => socketStore.incomingRequest?.sessionId,
  (id) => {
    if (id) startCountdown()
  },
  { immediate: true }
)

async function onUserRespond(accept: boolean): Promise<void> {
  if (sessionStore.isResponding) return
  clearTick()
  await sessionStore.handleRespond(accept)
}

onUnmounted(() => {
  clearTick()
})
</script>

<template>
  <section
    class="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-[#8a2be2] bg-[#05000a] p-4 shadow-[0_0_24px_rgba(138,43,226,0.35),0_0_8px_rgba(138,43,226,0.2)_inset]"
  >
    <div
      class="mb-0 rounded-lg border border-[#8a2be2] bg-[#0d001a] px-3 py-2 shadow-[0_0_12px_rgba(138,43,226,0.15)]"
    >
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-bell-ring" class="incoming-icon size-6 shrink-0" aria-hidden="true" />
        <h3 class="m-0 text-left text-sm font-bold leading-tight text-white">
          Nowa prośba o dostęp!
        </h3>
      </div>
    </div>

    <div class="incoming-timer">
      <div class="incoming-timer__track" aria-hidden="true">
        <div class="incoming-timer__fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <p class="incoming-timer__label tabular-nums" aria-live="polite">
        {{ timerMinutes }}:{{ timerSecondsPadded }}
      </p>
    </div>

    <div class="incoming-actions">
      <button
        type="button"
        class="incoming-actions__accept"
        :disabled="sessionStore.isResponding"
        @click="onUserRespond(true)"
      >
        <span>Akceptuj</span>
        <UIcon
          name="i-lucide-arrow-right"
          class="incoming-actions__accept-icon"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        class="incoming-actions__reject"
        aria-label="Odrzuć"
        :disabled="sessionStore.isResponding"
        @click="onUserRespond(false)"
      >
        <UIcon name="i-lucide-x" class="incoming-actions__reject-icon" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.incoming-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 14px;
  padding-bottom: 14px;
}

.incoming-timer__track {
  height: 6px;
  width: min(62%, 12.5rem);
  margin: 0 auto;
  flex-shrink: 0;
  background: #ffffff;
  overflow: hidden;
}

.incoming-timer__fill {
  height: 100%;
  background: #8a2be2;
  transition: width 0.25s linear;
}

.incoming-timer__label {
  margin: 22px 0 0;
  padding: 0 4px 2px;
  line-height: 1.35;
  text-align: center;
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.04em;
}

.incoming-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.incoming-actions__accept:disabled,
.incoming-actions__reject:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.incoming-actions__accept {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #8a2be2;
  border-radius: 9999px;
  background: #0d001a;
  box-shadow: 0 0 14px rgba(138, 43, 226, 0.28);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.incoming-actions__accept:hover {
  background: rgba(138, 43, 226, 0.28);
  box-shadow: 0 0 22px rgba(138, 43, 226, 0.5);
}

.incoming-actions__accept:active {
  transform: scale(0.98);
}

.incoming-actions__accept-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #f5f3ff;
  filter: drop-shadow(0 0 4px rgba(138, 43, 226, 0.6));
}

.incoming-actions__reject {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(138, 43, 226, 0.7);
  border-radius: 14px;
  background: #0d001a;
  box-shadow: 0 0 12px rgba(138, 43, 226, 0.2);
  color: #ffffff;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.incoming-actions__reject:hover {
  background: #160028;
  border-color: #8a2be2;
  box-shadow: 0 0 18px rgba(138, 43, 226, 0.38);
}

.incoming-actions__reject:active {
  transform: scale(0.98);
}

.incoming-actions__reject-icon {
  width: 20px;
  height: 20px;
  color: #f5f3ff;
  filter: drop-shadow(0 0 4px rgba(138, 43, 226, 0.6));
}

/* Dzwonek w nagłówku — neonowa biel + fioletowe halo */
.incoming-icon {
  color: #f5f3ff;
  filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.95))
    drop-shadow(0 0 10px rgba(138, 43, 226, 0.9)) drop-shadow(0 0 3px rgba(196, 181, 253, 0.5));
}
</style>
