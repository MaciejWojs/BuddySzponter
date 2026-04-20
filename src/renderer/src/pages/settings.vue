<script setup lang="ts">
import buddySzponterLogo from '@images/buddyszponterLogo.png'
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

onMounted(() => {
  displayName.value = defaultDisplayName.value
  displayNameDraft.value = displayName.value
  void refreshVersionsData()
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
    :class="{ 'settings-view--embedded': props.embedded }"
    aria-label="Ustawienia aplikacji"
  >
    <div class="settings-watermark" aria-hidden="true">
      <img :src="buddySzponterLogo" alt="" />
    </div>

    <header v-if="!props.embedded" class="settings-topbar">
      <NavBar v-model="activeTopNav" :items="topNavItems" />
    </header>

    <div class="settings-grid">
      <article class="settings-card">
        <h3>Informacje</h3>
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

      <article class="settings-card">
        <h3>Obraz</h3>
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

      <article class="settings-card settings-card--audio">
        <h3>Audio</h3>
        <AudioSettingsCard class="settings-audio-content" />
      </article>

      <article class="settings-card">
        <h3>Video</h3>
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

      <article class="settings-card">
        <h3>Sterowanie</h3>
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

      <article class="settings-card">
        <h3>Ogólne</h3>
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
  color: var(--color-text);
  background: color-mix(in srgb, var(--settings-bg-soft) 88%, transparent 12%);
  border: 1px solid color-mix(in srgb, var(--settings-border) 54%, transparent 46%);
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--settings-border) 18%, transparent 82%),
    0 14px 32px rgba(0, 0, 0, 0.36);
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
