<template>
  <div
    class="sharing-navbar-wrapper"
    :style="wrapperStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <nav
      v-show="visible"
      ref="navRef"
      class="sharing-navbar"
      :class="{ 'sharing-navbar--minimized': minimized, 'sharing-navbar--locked': pinned }"
      @mousedown="startDrag"
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
          <span class="sharing-navbar__name">{{ props.hostName }}</span>
          <button
            class="sharing-navbar__btn sharing-navbar__btn--tools"
            title="Tools"
            @click="openMenu"
          >
            <ToolsIcon class="sharing-navbar__icon" />
          </button>
        </div>

        <div class="sharing-navbar__right">
          <button class="sharing-navbar__btn" title="Minimalizuj" @click="handleMinimize">
            <UIcon name="i-lucide-minus" class="sharing-navbar__icon" />
          </button>
          <button
            class="sharing-navbar__btn sharing-navbar__btn--close"
            title="Zamknij"
            @click="handleClose"
          >
            <UIcon name="i-lucide-x" class="sharing-navbar__icon" />
          </button>
        </div>
      </template>

      <template v-else>
        <button
          class="sharing-navbar__btn sharing-navbar__btn--restore"
          title="Przywróć"
          @click="handleRestore"
        >
          <UIcon name="i-lucide-users" class="sharing-navbar__icon" />
        </button>
      </template>
    </nav>
  </div>

  <section
    v-if="isMenuOpen"
    class="shortcuts-overlay"
    aria-label="Menu skrótów systemowych"
    @click.self="closeMenu"
  >
    <div class="shortcuts-overlay__backdrop" />

    <div class="shortcuts-panel">
      <button type="button" class="shortcuts-panel__close" @click="closeMenu">
        <UIcon name="i-lucide-x" />
      </button>

      <header class="shortcuts-panel__header">
        <h2>Panel szybkich akcji</h2>
        <p>Wszystkie kluczowe skróty i narzędzia w twoim zasięgu</p>
      </header>

      <div class="shortcuts-layout">
        <article class="shortcuts-group shortcuts-group--system">
          <h3>
            <UIcon name="i-lucide-keyboard" />
            Skróty systemowe
          </h3>

          <p class="shortcuts-group__meta">Zarządzanie systemem</p>
          <button
            v-for="item in managementShortcuts"
            :key="item.id"
            type="button"
            class="shortcut-btn"
            @click="handleAction(item)"
          >
            <span class="shortcut-btn__keys">
              <template
                v-for="(part, index) in parseShortcut(item.label)"
                :key="`${item.id}-${part}-${index}`"
              >
                <span class="shortcut-btn__keycap">{{ part }}</span>
                <span v-if="index < parseShortcut(item.label).length - 1" class="shortcut-btn__plus"
                  >+</span
                >
              </template>
            </span>
            <small class="shortcut-btn__hint">{{ item.description }}</small>
          </button>

          <p class="shortcuts-group__meta">Otwieranie</p>
          <button
            v-for="item in availableShortcuts"
            :key="item.id"
            type="button"
            class="shortcut-btn"
            @click="handleAction(item)"
          >
            <span class="shortcut-btn__keys">
              <template
                v-for="(part, index) in parseShortcut(item.label)"
                :key="`${item.id}-${part}-${index}`"
              >
                <span class="shortcut-btn__keycap">{{ part }}</span>
                <span v-if="index < parseShortcut(item.label).length - 1" class="shortcut-btn__plus"
                  >+</span
                >
              </template>
            </span>
            <small class="shortcut-btn__hint">{{ item.description }}</small>
          </button>
        </article>

        <article class="shortcuts-group shortcuts-group--folders">
          <h3>
            <UIcon name="i-lucide-folder" />
            Skróty dostępne
          </h3>
          <p class="shortcuts-group__meta">Otwieranie</p>
          <div class="shortcuts-folder-grid">
            <button
              v-for="item in folderButtons"
              :key="item.id"
              type="button"
              class="shortcut-btn shortcut-btn--compact"
              @click="handleAction(item)"
            >
              <span class="shortcut-btn__row">
                <UIcon name="i-lucide-folder" class="shortcut-btn__mini-icon" />
                <span class="shortcut-btn__label">{{ item.label }}</span>
              </span>
              <small class="shortcut-btn__hint">{{ item.description }}</small>
            </button>
          </div>
        </article>

        <article class="shortcuts-group shortcuts-group--power">
          <h3>
            <UIcon name="i-lucide-power" />
            Kontrola zasilania
          </h3>
          <div class="shortcuts-power-row">
            <button
              v-for="item in powerButtons"
              :key="item.id"
              type="button"
              class="shortcut-btn shortcut-btn--danger shortcut-btn--power"
              @click="handleAction(item)"
            >
              <span class="shortcut-btn__row shortcut-btn__row--power">
                <UIcon
                  :name="getPowerIcon(item.id)"
                  class="shortcut-btn__mini-icon shortcut-btn__mini-icon--power"
                />
                <span class="shortcut-btn__label">{{ item.label }} komputer</span>
              </span>
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolsIcon from '@renderer/assets/images/components/tools.svg?component'

type MenuAction = {
  id: string
  label: string
  description: string
  requiresConfirmation?: boolean
}

const props = withDefaults(
  defineProps<{
    hostName?: string
  }>(),
  {
    hostName: 'Kamil Gruca'
  }
)

const isMenuOpen = ref(false)
const pinned = ref(false)
const minimized = ref(false)
const closed = ref(false)
const hovered = ref(false)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const dragSize = ref({ width: 0, height: 0 })
const minimizedSize = 30
const topOffset = 8
const navRef = ref<HTMLElement | null>(null)

const visible = computed(() => !closed.value || hovered.value)
const wrapperStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}))

const shortcutButtons: MenuAction[] = [
  {
    id: 'ctrl-shift-esc',
    label: 'Ctrl + Shift + Esc',
    description: 'Bezpośrednio otwiera Menedżer zadań.'
  },
  {
    id: 'ctrl-alt-delete',
    label: 'Ctrl + Alt + Delete',
    description: 'Otwiera menu bezpieczeństwa.'
  },
  {
    id: 'win-l',
    label: 'Win + L',
    description: 'Blokuje komputer.'
  },
  {
    id: 'win-d',
    label: 'Win + D',
    description: 'Pokaż / ukryj pulpit.'
  },
  {
    id: 'win-m',
    label: 'Win + M',
    description: 'Minimalizuj wszystkie okna.'
  },
  {
    id: 'win-e',
    label: 'Win + E',
    description: 'Otwiera eksplorator plików.'
  },
  {
    id: 'win-r',
    label: 'Win + R',
    description: 'Otwiera okno Uruchamianie (Run).'
  },
  {
    id: 'win-i',
    label: 'Win + I',
    description: 'Otwiera ustawienia systemu.'
  },
  {
    id: 'win-x',
    label: 'Win + X',
    description: 'Menu administratora (szybki dostęp do narzędzi systemowych).'
  },
  {
    id: 'win-shift-s',
    label: 'Win + Shift + S',
    description: 'Narzędzie do zaznaczania fragmentu ekranu.'
  }
]

const powerButtons: MenuAction[] = [
  {
    id: 'shutdown',
    label: 'Wyłącz',
    description: 'Wyłącz komputer.',
    requiresConfirmation: true
  },
  {
    id: 'restart',
    label: 'Zresetuj',
    description: 'Zresetuj komputer.',
    requiresConfirmation: true
  },
  {
    id: 'sleep',
    label: 'Uśpij',
    description: 'Uśpij komputer.',
    requiresConfirmation: true
  }
]

const folderButtons: MenuAction[] = [
  {
    id: 'this-pc',
    label: 'Ten komputer',
    description: 'Folder systemowy: Ten komputer.'
  },
  {
    id: 'downloads',
    label: 'Pobrane',
    description: 'Folder: Pobrane.'
  },
  {
    id: 'documents',
    label: 'Dokumenty',
    description: 'Folder: Dokumenty.'
  },
  {
    id: 'pictures',
    label: 'Obrazy',
    description: 'Folder: Obrazy.'
  },
  {
    id: 'music',
    label: 'Muzyka',
    description: 'Folder: Muzyka.'
  },
  {
    id: 'profile',
    label: 'Profil (%userprofile%)',
    description: 'Folder profilu użytkownika.'
  }
]

const managementShortcuts = shortcutButtons.filter(
  (item) => item.id === 'ctrl-shift-esc' || item.id === 'ctrl-alt-delete'
)
const availableShortcuts = shortcutButtons.filter(
  (item) => item.id !== 'ctrl-shift-esc' && item.id !== 'ctrl-alt-delete'
)

function handleAction(action: MenuAction): void {
  if (action.requiresConfirmation) {
    const confirmed = window.confirm(`Potwierdź akcję: ${action.label}`)
    if (!confirmed) {
      console.log(`[Menu Skrótów] Anulowano: ${action.label}`)
      return
    }
  }

  console.log(`[Menu Skrótów] Użyto przycisku: ${action.label}`)
}

function openMenu(): void {
  isMenuOpen.value = true
}

function closeMenu(): void {
  isMenuOpen.value = false
}

function parseShortcut(label: string): string[] {
  return label
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
}

function getPowerIcon(actionId: string): string {
  if (actionId === 'shutdown') {
    return 'i-lucide-power'
  }

  if (actionId === 'restart') {
    return 'i-lucide-refresh-cw'
  }

  return 'i-lucide-moon'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function onDrag(event: MouseEvent): void {
  if (!isDragging.value) {
    return
  }

  const nextX = event.clientX - dragOffset.value.x
  const nextY = event.clientY - dragOffset.value.y

  const maxX = Math.max(0, window.innerWidth - dragSize.value.width)
  const maxY = Math.max(0, window.innerHeight - dragSize.value.height)
  const minY = Math.min(topOffset, maxY)

  position.value = {
    x: clamp(nextX, 0, maxX),
    y: clamp(nextY, minY, maxY)
  }
}

function stopDrag(): void {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function startDrag(event: MouseEvent): void {
  if (pinned.value) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target?.closest('button')) {
    return
  }

  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget) {
    return
  }

  const rect = currentTarget.getBoundingClientRect()
  dragSize.value = {
    width: rect.width,
    height: rect.height
  }
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }

  isDragging.value = true
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  stopDrag()
})

onMounted(async () => {
  await nextTick()

  const navWidth =
    navRef.value?.getBoundingClientRect().width ?? Math.min(window.innerWidth * 0.33, 500)
  const centeredX = (window.innerWidth - navWidth) / 2

  position.value = {
    x: clamp(centeredX, 0, Math.max(0, window.innerWidth - navWidth)),
    y: topOffset
  }
})

function handleClose(): void {
  const navWidth =
    navRef.value?.getBoundingClientRect().width ?? Math.min(window.innerWidth * 0.33, 500)
  const centeredX = (window.innerWidth - navWidth) / 2

  closed.value = true
  position.value = {
    x: clamp(centeredX, 0, Math.max(0, window.innerWidth - navWidth)),
    y: topOffset
  }
}

function handleMinimize(): void {
  minimized.value = true
  const centeredX = (window.innerWidth - minimizedSize) / 2

  position.value = {
    x: Math.max(0, centeredX),
    y: topOffset
  }
}

async function handleRestore(): Promise<void> {
  minimized.value = false
  await nextTick()

  const navElement = navRef.value
  if (!navElement) {
    return
  }

  const rect = navElement.getBoundingClientRect()
  const centeredX = (window.innerWidth - rect.width) / 2
  const maxY = Math.max(0, window.innerHeight - rect.height)
  const minY = Math.min(topOffset, maxY)

  position.value = {
    x: clamp(centeredX, 0, Math.max(0, window.innerWidth - rect.width)),
    y: clamp(position.value.y, minY, maxY)
  }
}

function onMouseEnter(): void {
  hovered.value = true
  if (closed.value) {
    closed.value = false
  }
}

function onMouseLeave(): void {
  hovered.value = false
}

function togglePin(): void {
  pinned.value = !pinned.value
  if (pinned.value) {
    stopDrag()
  }
  window.api.window.setAlwaysOnTop(pinned.value)
}
</script>

<style scoped>
.sharing-navbar-wrapper {
  width: 33vw;
  max-width: 500px;
  min-height: 30px;
  position: fixed;
  z-index: 30;
}

.sharing-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-accent);
  border-radius: 8px;
  padding: 4px 10px;
  height: 30px;
  transition: opacity 0.2s;
  cursor: grab;
}

.sharing-navbar:active {
  cursor: grabbing;
}

.sharing-navbar--locked,
.sharing-navbar--locked:active {
  cursor: default;
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

.sharing-navbar__btn--tools {
  padding: 4px;
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
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  justify-content: center;
}

.sharing-navbar__btn--restore {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 0;
  justify-content: center;
}

.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  --tools-accent-rgb: 167, 73, 252;
  --tools-accent-soft-rgb: 200, 143, 255;
  --tools-bg-1: rgba(10, 5, 22, 0.95);
  --tools-bg-2: rgba(6, 2, 16, 0.94);
}

.shortcuts-overlay__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(var(--tools-accent-rgb), 0.26), transparent 46%),
    radial-gradient(circle at 84% 78%, rgba(var(--tools-accent-soft-rgb), 0.2), transparent 45%),
    rgba(4, 1, 12, 0.6);
  backdrop-filter: blur(16px) saturate(122%);
  -webkit-backdrop-filter: blur(16px) saturate(122%);
}

.shortcuts-panel {
  position: relative;
  width: min(1160px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(var(--tools-accent-rgb), 0.38);
  border-radius: 22px;
  background: linear-gradient(145deg, var(--tools-bg-1), var(--tools-bg-2)), rgba(7, 12, 21, 0.92);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px rgba(255, 255, 255, 0.05);
  padding: 22px;
  color: #e6f4ff;
}

.shortcuts-panel__close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--tools-accent-soft-rgb), 0.55);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(54, 30, 90, 0.86), rgba(35, 20, 61, 0.83));
  color: #f6eaff;
  width: 30px;
  height: 30px;
  padding: 0;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    transform 0.16s ease;
}

.shortcuts-panel__close :deep(svg) {
  display: block;
  width: 16px;
  height: 16px;
}

.shortcuts-panel__close:hover,
.shortcuts-panel__close:focus-visible {
  border-color: rgba(232, 201, 255, 0.95);
  background: linear-gradient(180deg, rgba(76, 44, 124, 0.9), rgba(50, 29, 83, 0.88));
  transform: translateY(-1px);
  outline: none;
}

.shortcuts-panel__header h2 {
  margin: 0;
  font-size: clamp(1.2rem, 3vw, 1.7rem);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #f2e8ff;
}

.shortcuts-panel__header p {
  margin: 10px 0 0;
  opacity: 0.9;
  font-size: 0.92rem;
  color: rgba(236, 219, 255, 0.9);
}

.shortcuts-layout {
  margin-top: 16px;
  display: grid;
  grid-template-columns:
    minmax(0, 1.8fr)
    minmax(230px, 0.8fr)
    minmax(230px, 0.8fr);
  gap: 16px;
}

.shortcuts-group {
  border: 1px solid rgba(var(--tools-accent-rgb), 0.28);
  border-radius: 16px;
  padding: 14px 14px 12px;
  background: linear-gradient(
    180deg,
    rgba(var(--tools-accent-rgb), 0.12),
    rgba(var(--tools-accent-soft-rgb), 0.03)
  );
}

.shortcuts-group__meta {
  margin: -6px 0 10px;
  color: rgba(223, 196, 255, 0.8);
  font-size: 0.78rem;
}

.shortcuts-group h3 {
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #f1e6ff;
}

.shortcuts-group--system {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shortcuts-group--system h3 {
  grid-column: 1 / -1;
  margin-bottom: 4px;
}

.shortcuts-group--system .shortcuts-group__meta {
  grid-column: 1 / -1;
  margin-bottom: 2px;
}

.shortcuts-group--system .shortcut-btn {
  min-height: 76px;
  padding: 8px 9px;
}

.shortcuts-group--system .shortcut-btn__hint {
  margin-top: 3px;
  font-size: 0.72rem;
  line-height: 1.2;
}

.shortcuts-folder-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.shortcuts-power-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.shortcuts-group--power {
  display: flex;
  flex-direction: column;
}

.shortcuts-group--power .shortcuts-power-row {
  width: 100%;
  margin-top: auto;
  margin-bottom: auto;
}

.shortcut-btn {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(var(--tools-accent-soft-rgb), 0.48);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(55, 31, 92, 0.74), rgba(33, 19, 58, 0.72));
  color: #f8f1ff;
  padding: 10px 11px;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.shortcut-btn__label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}

.shortcut-btn__keys {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.shortcut-btn__keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid rgba(var(--tools-accent-soft-rgb), 0.9);
  background: linear-gradient(
    180deg,
    rgba(var(--tools-accent-rgb), 0.92),
    rgba(124, 44, 210, 0.88)
  );
  color: #f8f0ff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0 8px;
}

.shortcut-btn__plus {
  color: rgba(238, 220, 255, 0.92);
  font-weight: 700;
}

.shortcut-btn__hint {
  display: block;
  margin-top: 4px;
  color: rgba(231, 216, 247, 0.84);
  font-size: 0.75rem;
  line-height: 1.35;
}

.shortcut-btn__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-btn__row--power {
  flex-direction: column;
  justify-content: center;
  text-align: center;
  gap: 10px;
}

.shortcut-btn__mini-icon {
  width: 18px;
  height: 18px;
  color: #d3a9ff;
}

.shortcut-btn__mini-icon--power {
  color: #ff9f9f;
}

.shortcut-btn:hover,
.shortcut-btn:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(222, 184, 255, 0.95);
  background: linear-gradient(180deg, rgba(76, 43, 126, 0.88), rgba(48, 27, 85, 0.86));
  box-shadow: 0 8px 16px rgba(7, 21, 36, 0.4);
  outline: none;
}

.shortcut-btn--compact {
  min-height: 64px;
}

.shortcut-btn--power {
  min-height: 116px;
}

.shortcut-btn--danger {
  border-color: rgba(255, 157, 157, 0.8);
  background: linear-gradient(180deg, rgba(102, 28, 43, 0.8), rgba(72, 19, 30, 0.78));
}

.shortcut-btn--danger:hover,
.shortcut-btn--danger:focus-visible {
  border-color: rgba(255, 203, 203, 0.96);
  background: linear-gradient(180deg, rgba(136, 38, 58, 0.88), rgba(90, 25, 39, 0.84));
}

@media (max-width: 1024px) {
  .shortcuts-layout {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'system system'
      'folders power';
  }

  .shortcuts-group--system {
    grid-area: system;
  }

  .shortcuts-group--folders {
    grid-area: folders;
  }

  .shortcuts-group--power {
    grid-area: power;
  }
}

@media (max-width: 700px) {
  .sharing-navbar-wrapper {
    width: 88vw;
  }

  .shortcuts-overlay {
    padding: 12px;
  }

  .shortcuts-panel {
    padding: 14px;
    border-radius: 14px;
  }

  .shortcuts-layout {
    grid-template-columns: 1fr;
    grid-template-areas: none;
    gap: 10px;
  }

  .shortcuts-group--system,
  .shortcuts-group--shortcuts,
  .shortcuts-folder-grid,
  .shortcuts-power-row {
    grid-template-columns: 1fr;
  }
}
</style>
