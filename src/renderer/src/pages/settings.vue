<script setup lang="ts">
import gsap from 'gsap'
import buddySzponterLogo from '@images/szpontlogo.png'
import BuLanguageSelector from '@renderer/components/simpleComponents/BuLanguageSelector.vue'
import NavBar from '@renderer/components/UI/NavBar.vue'
import type { NavBarItem } from '@renderer/components/UI/NavBar.vue'
import DevicesButton from '@renderer/components/simpleComponents/DevicesButton.vue'
import HomeButton from '@renderer/components/simpleComponents/HomeButton.vue'
import SettingButton from '@renderer/components/simpleComponents/SettingButton.vue'
import AudioSettingsCard from '@renderer/components/audio/AudioSettingsCard.vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useUserStore } from '@renderer/stores/userStore'
import { storeToRefs } from 'pinia'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  {
    embedded: false
  }
)

const accelerationEnabled = ref(true)
const remoteCursorEnabled = ref(true)
const autoRecordEnabled = ref(true)
const allowWindowsShortcuts = ref(true)
const autostartEnabled = ref(true)
const darkThemeEnabled = ref(true)
const lightThemeEnabled = ref(false)

const settingsStore = useSettingsStore()
const { supportedVersions, versionStatus } = storeToRefs(settingsStore)
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const router = useRouter()

const currentVersion = ref('-')
const isRefreshingVersions = ref(false)
const displayName = ref('')
const displayNameDraft = ref('')
const isEditingDisplayName = ref(false)
const activeTopNav = ref('settings')
type SettingsCardKey = 'info' | 'image' | 'audio' | 'video' | 'controls' | 'general'
const selectedCard = ref<SettingsCardKey | null>(null)
const isCardTransitioning = ref(false)

const topNavItems: NavBarItem[] = [
  {
    name: 'settings',
    component: SettingButton
  },
  {
    name: 'home',
    component: HomeButton
  },
  {
    name: 'devices',
    component: DevicesButton
  }
]

const defaultDisplayName = computed(() => currentUser.value?.nickname || 'Pseudonim')
const isDisplayNameDirty = computed(
  () => displayNameDraft.value.trim() !== '' && displayNameDraft.value.trim() !== displayName.value
)

const availableVersionsLabel = computed(() => {
  if (!supportedVersions.value.length) return 'brak danych'
  return supportedVersions.value.map((entry) => entry.version).join(' | ')
})

async function refreshVersionsData(): Promise<void> {
  if (isRefreshingVersions.value) return
  isRefreshingVersions.value = true
  try {
    const [version] = await Promise.all([
      settingsStore.getCurrentVersion(),
      settingsStore.fetchSupportedVersions(),
      settingsStore.checkVersionStatus()
    ])
    currentVersion.value = version
  } catch (error) {
    console.error('[settings] Failed to refresh versions:', error)
  } finally {
    isRefreshingVersions.value = false
  }
}

function startDisplayNameEdit(): void {
  displayNameDraft.value = displayName.value || defaultDisplayName.value
  isEditingDisplayName.value = true
}

function saveDisplayName(): void {
  if (!isEditingDisplayName.value) return
  const nextValue = displayNameDraft.value.trim() || defaultDisplayName.value
  displayName.value = nextValue
  isEditingDisplayName.value = false
}

function isCardOpen(key: SettingsCardKey): boolean {
  return selectedCard.value === key
}

function handleCardClick(key: SettingsCardKey): void {
  if (selectedCard.value || isCardTransitioning.value) return
  openCard(key)
}

async function openCard(key: SettingsCardKey): Promise<void> {
  if (selectedCard.value === key) return
  isCardTransitioning.value = true
  selectedCard.value = key
  await nextTick()

  const activeCard = document.querySelector<HTMLElement>(
    `.settings-card--active[data-card-key="${key}"]`
  )

  if (!activeCard) {
    isCardTransitioning.value = false
    return
  }

  gsap.killTweensOf(activeCard)
  gsap.fromTo(
    activeCard,
    { opacity: 0, scale: 0.94, y: 18, transformOrigin: 'center center' },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.24,
      ease: 'power2.out',
      onComplete: () => {
        isCardTransitioning.value = false
      },
      onInterrupt: () => {
        isCardTransitioning.value = false
      }
    }
  )
}

function closeActiveCard(): void {
  if (!selectedCard.value || isCardTransitioning.value) return

  const cardKey = selectedCard.value
  const activeCard = document.querySelector<HTMLElement>(
    `.settings-card--active[data-card-key="${cardKey}"]`
  )

  if (!activeCard) {
    selectedCard.value = null
    return
  }

  isCardTransitioning.value = true
  gsap.killTweensOf(activeCard)
  gsap.to(activeCard, {
    opacity: 0,
    scale: 0.96,
    y: 12,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      selectedCard.value = null
      isCardTransitioning.value = false
      gsap.set(activeCard, { clearProps: 'transform,opacity' })
    },
    onInterrupt: () => {
      selectedCard.value = null
      isCardTransitioning.value = false
      gsap.set(activeCard, { clearProps: 'transform,opacity' })
    }
  })
}

function handleDocumentPointerDown(event: MouseEvent): void {
  if (!selectedCard.value) return

  const activeCard = document.querySelector<HTMLElement>('.settings-card--active')
  if (!activeCard) return

  const target = event.target as Node | null
  if (target && activeCard.contains(target)) return

  closeActiveCard()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !selectedCard.value) return

  event.preventDefault()
  closeActiveCard()
}

onMounted(() => {
  displayName.value = defaultDisplayName.value
  displayNameDraft.value = displayName.value
  void refreshVersionsData()
  document.addEventListener('mousedown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

watch(
  defaultDisplayName,
  (nextValue) => {
    if (!isEditingDisplayName.value) {
      displayName.value = nextValue
      displayNameDraft.value = nextValue
    }
  },
  { immediate: true }
)

watch(activeTopNav, (nextTab) => {
  if (nextTab === 'home') {
    void router.push('/Menu')
    return
  }

  if (nextTab === 'devices') {
    void router.push('/shared')
    return
  }
})
</script>

<template>
  <section
    class="settings-view"
    :class="{
      'settings-view--embedded': props.embedded,
      'settings-view--card-open': Boolean(selectedCard)
    }"
    aria-label="Ustawienia aplikacji"
  >
    <div class="settings-watermark" aria-hidden="true">
      <img :src="buddySzponterLogo" alt="" />
    </div>

    <header v-if="!props.embedded" class="settings-topbar">
      <NavBar v-model="activeTopNav" :items="topNavItems" />
    </header>

    <div class="settings-grid">
      <article
        class="settings-card"
        data-card-key="info"
        :class="{ 'settings-card--active': isCardOpen('info') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('info')"
          @keydown.enter.stop.prevent="handleCardClick('info')"
          @keydown.space.stop.prevent="handleCardClick('info')"
        >
          Informacje
        </h3>
        <button
          v-if="isCardOpen('info')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <div class="settings-row settings-row-display-name">
          <span>Twoja wyświetlana nazwa</span>
          <div class="settings-display-name-controls">
            <input
              v-model="displayNameDraft"
              class="settings-display-name-input"
              maxlength="40"
              :readonly="!isEditingDisplayName"
              @click="startDisplayNameEdit"
              @keyup.enter="saveDisplayName"
            />

            <div class="settings-display-name-actions">
              <button
                class="settings-small-btn"
                :disabled="!isDisplayNameDirty"
                @click="saveDisplayName"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <span>Nazwa urządzenia</span>
          <input value="LAPTOP-MAREK" readonly />
        </div>
      </article>

      <article
        class="settings-card"
        data-card-key="image"
        :class="{ 'settings-card--active': isCardOpen('image') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('image')"
          @keydown.enter.stop.prevent="handleCardClick('image')"
          @keydown.space.stop.prevent="handleCardClick('image')"
        >
          Obraz
        </h3>
        <button
          v-if="isCardOpen('image')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <div class="settings-row">
          <span>Skalowanie obrazu</span>
          <button>Pełny ekran</button>
        </div>
        <label class="settings-row settings-row-checkbox">
          <span>Akceleracja sprzętowa</span>
          <input v-model="accelerationEnabled" type="checkbox" />
        </label>
        <label class="settings-row settings-row-checkbox">
          <span>Wyświetlaj kursor zdalny</span>
          <input v-model="remoteCursorEnabled" type="checkbox" />
        </label>
        <div class="settings-row">
          <span>Jakość połączenia</span>
          <button>Jakość połączenia</button>
        </div>
      </article>

      <article
        class="settings-card settings-card--audio"
        data-card-key="audio"
        :class="{ 'settings-card--active': isCardOpen('audio') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('audio')"
          @keydown.enter.stop.prevent="handleCardClick('audio')"
          @keydown.space.stop.prevent="handleCardClick('audio')"
        >
          Audio
        </h3>
        <button
          v-if="isCardOpen('audio')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <AudioSettingsCard class="settings-audio-content" />
      </article>

      <article
        class="settings-card"
        data-card-key="video"
        :class="{ 'settings-card--active': isCardOpen('video') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('video')"
          @keydown.enter.stop.prevent="handleCardClick('video')"
          @keydown.space.stop.prevent="handleCardClick('video')"
        >
          Video
        </h3>
        <button
          v-if="isCardOpen('video')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <div class="settings-row">
          <span>Jakość nagrywania</span>
          <button>Wysoka (fullHD, 60 FPS)</button>
        </div>
        <div class="settings-row settings-row-path">
          <span>Lokalizacja nagrań</span>
          <div class="settings-inline-controls settings-inline-controls-path">
            <input value="D:\Nagrania_Spotkań\V67Szpont" readonly class="settings-path-input" />
            <button class="settings-small-btn">Zmień</button>
          </div>
        </div>
        <label class="settings-row settings-row-checkbox">
          <span>Automatyczne nagrywanie</span>
          <input v-model="autoRecordEnabled" type="checkbox" />
        </label>
        <div class="settings-row">
          <span>Wybór mikrofonu</span>
          <button>Domyślny</button>
        </div>
        <div class="settings-row">
          <span>Wybór dźwięku</span>
          <button>Domyślny</button>
        </div>
      </article>

      <article
        class="settings-card"
        data-card-key="controls"
        :class="{ 'settings-card--active': isCardOpen('controls') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('controls')"
          @keydown.enter.stop.prevent="handleCardClick('controls')"
          @keydown.space.stop.prevent="handleCardClick('controls')"
        >
          Sterowanie
        </h3>
        <button
          v-if="isCardOpen('controls')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <div class="settings-row">
          <span>Synchronizacja schowka</span>
          <button>Synchronizacja schowka</button>
        </div>
        <label class="settings-row settings-row-checkbox">
          <span>Skróty systemowe</span>
          <span class="settings-checkbox-with-label">
            <input v-model="allowWindowsShortcuts" type="checkbox" />
            <span>Zezwalaj na skróty windows</span>
          </span>
        </label>
        <div class="settings-row">
          <span>Zasady spotkania</span>
          <button>Zasady spotkania</button>
        </div>
      </article>

      <article
        class="settings-card"
        data-card-key="general"
        :class="{ 'settings-card--active': isCardOpen('general') }"
      >
        <h3
          class="settings-card-trigger"
          role="button"
          tabindex="0"
          @click.stop="handleCardClick('general')"
          @keydown.enter.stop.prevent="handleCardClick('general')"
          @keydown.space.stop.prevent="handleCardClick('general')"
        >
          Ogólne
        </h3>
        <button
          v-if="isCardOpen('general')"
          class="settings-card-close"
          aria-label="Zamknij kartę"
          @click.stop="closeActiveCard"
        >
          ×
        </button>
        <div class="settings-row settings-row-language">
          <span>Język</span>
          <div class="settings-inline-controls">
            <BuLanguageSelector :size="24" />
          </div>
        </div>
        <label class="settings-row settings-row-checkbox">
          <span>Autostart</span>
          <span class="settings-checkbox-with-label">
            <input v-model="autostartEnabled" type="checkbox" />
            <span>Uruchom przy starcie systemu</span>
          </span>
        </label>
        <div class="settings-row">
          <span>Wersja aktualna</span>
          <strong>{{ currentVersion }}</strong>
        </div>
        <div class="settings-row">
          <span>Dostępne wersje</span>
          <span class="settings-version-list">{{ availableVersionsLabel }}</span>
        </div>
        <div class="settings-row">
          <span>Status wersji</span>
          <strong>{{ versionStatus }}</strong>
        </div>
        <div class="settings-row">
          <span>Aktualizacja</span>
          <button :disabled="isRefreshingVersions" @click="refreshVersionsData">
            {{ isRefreshingVersions ? 'Aktualizowanie...' : 'Zaaktualizuj wersje' }}
          </button>
        </div>
        <div class="settings-row settings-row-theme">
          <span>Motyw</span>
          <div class="settings-inline-controls settings-theme-controls">
            <label>
              <input v-model="darkThemeEnabled" type="checkbox" />
              Ciemny
            </label>
            <label>
              <input v-model="lightThemeEnabled" type="checkbox" />
              Jasny
            </label>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.settings-view {
  --settings-bg-soft: color-mix(in srgb, var(--color-component) 88%, #000 12%);
  --settings-border: color-mix(in srgb, var(--color-accent) 78%, #fff 22%);
  --settings-glow: color-mix(in srgb, var(--color-accent) 62%, transparent 38%);
  --settings-text-soft: color-mix(in srgb, var(--color-text) 72%, #ffffff 28%);

  width: min(1240px, 100%);
  margin: 26px auto 0;
  position: relative;
  isolation: isolate;
  padding: 10px 12px 30px;
}

.settings-view--embedded {
  margin-top: 8px;
}

.settings-topbar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.settings-topbar :deep(button) {
  min-width: 64px;
  min-height: 64px;
  aspect-ratio: 1 / 1;
  font-size: 22px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  box-sizing: border-box;
  background: none;
}

.settings-topbar :deep(svg) {
  width: 70%;
  height: 70%;
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
  display: block;
  margin: auto;
}

.settings-watermark {
  position: absolute;
  inset: 10% 18% 6%;
  pointer-events: none;
  opacity: 0.07;
  z-index: 0;
}

.settings-watermark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.settings-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 340px));
  justify-content: center;
  gap: 28px;
  align-items: start;
}

.settings-card {
  position: relative;
  color: var(--color-text);
  background: color-mix(in srgb, var(--settings-bg-soft) 88%, transparent 12%);
  border: 1px solid color-mix(in srgb, var(--settings-border) 54%, transparent 46%);
  border-radius: 14px;
  padding: 14px;
  cursor: default;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--settings-border) 18%, transparent 82%),
    0 14px 32px rgba(0, 0, 0, 0.36);
}

.settings-card:hover {
  border-color: color-mix(in srgb, var(--settings-border) 80%, transparent 20%);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--settings-border) 36%, transparent 64%),
    0 18px 36px rgba(0, 0, 0, 0.44);
}

.settings-card-trigger {
  cursor: pointer;
}

.settings-view--card-open .settings-card:not(.settings-card--active) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.settings-view--card-open .settings-card--active {
  pointer-events: auto;
  opacity: 1;
}

.settings-card--active {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(804px, calc(100vw - 24px));
  max-width: min(804px, calc(100vw - 24px));
  height: fit-content;
  max-height: calc(100vh - 54px);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 110;
  cursor: default;
  padding: 30px 22px 18px;
  background: color-mix(in srgb, var(--settings-bg-soft) 88%, transparent 12%);
  border-color: color-mix(in srgb, var(--settings-border) 54%, transparent 46%);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--settings-border) 18%, transparent 82%),
    0 22px 42px rgba(0, 0, 0, 0.52);
}

.settings-card--active .settings-card-trigger {
  margin-bottom: 16px;
  padding-right: 58px;
}

.settings-card--active .settings-card-close {
  top: 5px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  transform: none;
  box-shadow: 0 0 12px color-mix(in srgb, var(--settings-glow) 44%, transparent 56%);
}

.settings-card--active,
.settings-card--active * {
  pointer-events: auto;
}

.settings-card--active .settings-audio-content {
  max-height: calc(100vh - 230px);
}

.settings-card-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 130;
  width: 24px;
  height: 24px;
  border: 1px solid color-mix(in srgb, var(--settings-border) 62%, transparent 38%);
  border-radius: 7px;
  background: color-mix(in srgb, var(--color-component) 88%, #000 12%);
  color: transparent;
  font-size: 15px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.settings-card-close::before {
  content: '';
  position: absolute;
  width: 11px;
  height: 2px;
  border-radius: 999px;
  background: var(--color-text);
  transform: rotate(45deg);
}

.settings-card-close::after {
  content: '';
  position: absolute;
  width: 11px;
  height: 2px;
  border-radius: 999px;
  background: var(--color-text);
  transform: rotate(-45deg);
}

.settings-card-close:hover {
  border-color: color-mix(in srgb, var(--settings-border) 85%, #fff 15%);
}

.settings-card--audio {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.settings-audio-content {
  max-height: 220px;
  overflow-y: scroll;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-accent) 64%, #ffffff 36%) transparent;
}

.settings-audio-content::-webkit-scrollbar {
  width: 8px;
}

.settings-audio-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-audio-content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--settings-border) 56%, transparent 44%);
  background: color-mix(in srgb, var(--color-accent) 44%, #2b1740 56%);
}

.settings-audio-content::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--color-accent) 58%, #2b1740 42%);
}

.settings-card h3 {
  margin: 0 0 14px;
  padding: 9px 14px;
  text-align: center;
  font-weight: 500;
  font-size: 22px;
  letter-spacing: 0.35px;
  border: 1px solid color-mix(in srgb, var(--settings-border) 70%, transparent 30%);
  border-radius: 10px;
  box-shadow:
    0 0 18px color-mix(in srgb, var(--settings-glow) 48%, transparent 52%),
    inset 0 0 12px color-mix(in srgb, var(--color-accent) 20%, transparent 80%);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-component) 74%, #13061f 26%),
    color-mix(in srgb, var(--color-component) 86%, #03000c 14%)
  );
}

.settings-row {
  min-height: 34px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  margin-bottom: 8px;
}

.settings-row span {
  opacity: 0.95;
  color: var(--settings-text-soft);
  min-width: 0;
}

.settings-row input[type='text'],
.settings-row input:not([type]) {
  width: 172px;
}

.settings-row input,
.settings-row button,
.settings-inline-controls input {
  background: color-mix(in srgb, var(--color-component) 84%, #000 16%);
  color: var(--color-text);
  border: 1px solid color-mix(in srgb, var(--settings-border) 58%, transparent 42%);
  border-radius: 6px;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--settings-glow) 32%, transparent 68%);
}

.settings-row button:disabled {
  opacity: 0.7;
  cursor: default;
}

.settings-row button {
  cursor: pointer;
  min-width: 0;
  width: 100%;
}

.settings-row button:hover {
  border-color: color-mix(in srgb, var(--settings-border) 84%, #fff 16%);
  box-shadow: 0 0 14px color-mix(in srgb, var(--settings-glow) 42%, transparent 58%);
}

.settings-row-checkbox {
  grid-template-columns: minmax(0, 1fr) auto;
}

.settings-row-checkbox input,
.settings-theme-controls input {
  width: 14px;
  height: 14px;
  margin: 0;
  padding: 0;
  accent-color: var(--color-accent);
}

.settings-inline-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  justify-content: flex-end;
}

.settings-row-path {
  display: block;
  gap: 8px;
  margin-bottom: 10px;
}

.settings-row-path .settings-inline-controls {
  width: 100%;
  justify-content: flex-end;
  min-width: 0;
  margin-top: 6px;
}

.settings-row-path input {
  width: 100%;
}

.settings-path-input {
  min-width: 0;
  flex: 1;
}

.settings-inline-controls-path {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.settings-small-btn {
  flex-shrink: 0;
}

.settings-row-display-name {
  display: block;
  gap: 8px;
  margin-bottom: 12px;
}

.settings-display-name-controls {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
}

.settings-display-name-input {
  width: 100%;
  min-width: 0;
}

.settings-display-name-input[readonly] {
  cursor: text;
}

.settings-display-name-actions {
  display: flex;
  align-items: center;
  justify-content: stretch;
  gap: 6px;
}

.settings-display-name-actions .settings-small-btn {
  width: 100%;
}

.settings-row-language,
.settings-row-theme {
  grid-template-columns: minmax(0, 1fr) auto;
}

.settings-checkbox-with-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-row-theme {
  align-items: center;
}

.settings-theme-controls {
  gap: 18px;
}

.settings-theme-controls label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.settings-row strong {
  color: color-mix(in srgb, var(--color-accent) 56%, #fff 44%);
}

.settings-version-list {
  max-width: 170px;
  text-align: right;
  overflow-wrap: anywhere;
}

.settings-row-language :deep(.bu-language-select) {
  border-color: color-mix(in srgb, var(--settings-border) 58%, transparent 42%);
  background: color-mix(in srgb, var(--color-component) 84%, #000 16%);
}

@media (max-width: 1200px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(280px, 360px));
    justify-content: center;
    gap: 20px;
  }

  .settings-card h3 {
    font-size: 26px;
  }
}

@media (max-width: 760px) {
  .settings-view {
    margin-top: 8px;
    padding: 0 4px 18px;
  }

  .settings-topbar {
    margin-bottom: 10px;
  }

  .settings-topbar :deep(button) {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    font-size: 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .settings-card h3 {
    font-size: 22px;
    margin-bottom: 10px;
  }

  .settings-row {
    font-size: 13px;
    grid-template-columns: 1fr;
    margin-bottom: 10px;
  }

  .settings-row input,
  .settings-row button,
  .settings-inline-controls input {
    width: 100%;
  }

  .settings-version-list {
    max-width: 100%;
    text-align: left;
  }

  .settings-row button {
    min-width: 0;
  }

  .settings-row-path .settings-inline-controls {
    width: 100%;
  }

  .settings-inline-controls-path {
    grid-template-columns: 1fr;
  }

  .settings-display-name-controls {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .settings-display-name-actions {
    width: 100%;
  }

  .settings-inline-controls {
    width: 100%;
    gap: 8px;
    flex-wrap: wrap;
  }

  .settings-audio-content {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }

  .settings-checkbox-with-label {
    width: 100%;
  }
}
</style>
