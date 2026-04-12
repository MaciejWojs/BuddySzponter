<script setup lang="ts">
import buddySzponterLogo from '@images/buddyszponterLogo.png'
import BuLanguageSelector from '@renderer/components/simpleComponents/BuLanguageSelector.vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { storeToRefs } from 'pinia'

const accelerationEnabled = ref(true)
const remoteCursorEnabled = ref(true)
const blockMouseEnabled = ref(true)
const blockKeyboardEnabled = ref(true)
const autoRecordEnabled = ref(true)
const allowWindowsShortcuts = ref(true)
const autostartEnabled = ref(true)
const darkThemeEnabled = ref(true)
const lightThemeEnabled = ref(false)

const settingsStore = useSettingsStore()
const { supportedVersions, versionStatus } = storeToRefs(settingsStore)

const currentVersion = ref('-')
const isRefreshingVersions = ref(false)

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

onMounted(() => {
  void refreshVersionsData()
})
</script>

<template>
  <section class="settings-view" aria-label="Ustawienia aplikacji">
    <div class="settings-watermark" aria-hidden="true">
      <img :src="buddySzponterLogo" alt="" />
    </div>

    <div class="settings-grid">
      <article class="settings-card">
        <h3>Informacje</h3>
        <div class="settings-row">
          <span>Twoja wyświetlana nazwa</span>
          <input value="DESKTOP-4674267523" readonly />
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

      <article class="settings-card">
        <h3>Bezpieczeństwo</h3>
        <div class="settings-row">
          <span>Zasady połączeń</span>
          <button>Zasady połączeń</button>
        </div>
        <div class="settings-row">
          <span>Gdy sesja się kończy</span>
          <button>Koniec sesji</button>
        </div>
        <label class="settings-row settings-row-checkbox">
          <span>Zablokuj mysz oponentowi</span>
          <input v-model="blockMouseEnabled" type="checkbox" />
        </label>
        <label class="settings-row settings-row-checkbox">
          <span>Zablokuj klawiaturę oponentowi</span>
          <input v-model="blockKeyboardEnabled" type="checkbox" />
        </label>
      </article>

      <article class="settings-card">
        <h3>Video</h3>
        <div class="settings-row">
          <span>Jakość nagrywania</span>
          <button>Wysoka (fullHD, 60 FPS)</button>
        </div>
        <div class="settings-row settings-row-path">
          <span>Lokalizacja nagrań</span>
          <div class="settings-inline-controls">
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

  width: min(1360px, 100%);
  margin: 42px auto 0;
  position: relative;
  padding: 10px 12px 30px;
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
  grid-template-columns: repeat(3, minmax(280px, 360px));
  justify-content: center;
  gap: 44px 56px;
  align-items: start;
}

.settings-card {
  color: var(--color-text);
  background: color-mix(in srgb, var(--settings-bg-soft) 88%, transparent 12%);
  border: 1px solid color-mix(in srgb, var(--settings-border) 54%, transparent 46%);
  border-radius: 14px;
  padding: 16px 16px 14px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--settings-border) 18%, transparent 82%),
    0 14px 32px rgba(0, 0, 0, 0.36);
}

.settings-card h3 {
  margin: 0 0 16px;
  padding: 9px 14px;
  text-align: center;
  font-weight: 500;
  font-size: 30px;
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
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  font-size: 14px;
  margin-bottom: 10px;
}

.settings-row span {
  opacity: 0.95;
  color: var(--settings-text-soft);
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
  height: 28px;
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
  min-width: 128px;
}

.settings-row button:hover {
  border-color: color-mix(in srgb, var(--settings-border) 84%, #fff 16%);
  box-shadow: 0 0 14px color-mix(in srgb, var(--settings-glow) 42%, transparent 58%);
}

.settings-row-checkbox {
  align-items: center;
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
}

.settings-row-path {
  align-items: flex-start;
}

.settings-row-path .settings-inline-controls {
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.settings-row-path input {
  width: 170px;
}

.settings-path-input {
  min-width: 0;
  flex: 1;
}

.settings-small-btn {
  flex-shrink: 0;
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
  max-width: 210px;
  text-align: right;
  overflow-wrap: anywhere;
}

.settings-row-language :deep(.bu-language-select) {
  border-color: color-mix(in srgb, var(--settings-border) 58%, transparent 42%);
  background: color-mix(in srgb, var(--color-component) 84%, #000 16%);
}

@media (max-width: 1200px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(280px, 380px));
    justify-content: center;
    gap: 28px 30px;
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
    flex-wrap: wrap;
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

  .settings-inline-controls {
    width: 100%;
    gap: 8px;
    flex-wrap: wrap;
  }

  .settings-checkbox-with-label {
    width: 100%;
  }
}
</style>
