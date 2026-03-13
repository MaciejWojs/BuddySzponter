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
        <h2>System Tools</h2>
        <p>Skróty i szybkie akcje. Na ten moment każde kliknięcie tylko loguje użycie.</p>
      </header>

      <div class="shortcuts-layout">
        <article class="shortcuts-group shortcuts-group--shortcuts">
          <h3>
            <UIcon name="i-lucide-keyboard" />
            Skróty klawiaturowe
          </h3>
          <button
            v-for="item in shortcutButtons"
            :key="item.id"
            type="button"
            class="shortcut-btn"
            @click="handleAction(item)"
          >
            <span class="shortcut-btn__label shortcut-btn__label--kbd">{{ item.label }}</span>
            <small class="shortcut-btn__hint">{{ item.description }}</small>
          </button>
        </article>

        <div class="shortcuts-side">
          <article class="shortcuts-group shortcuts-group--folders">
            <h3>
              <UIcon name="i-lucide-folder" />
              Foldery
            </h3>
            <div class="shortcuts-folder-grid">
              <button
                v-for="item in folderButtons"
                :key="item.id"
                type="button"
                class="shortcut-btn shortcut-btn--compact"
                @click="handleAction(item)"
              >
                <span class="shortcut-btn__label">{{ item.label }}</span>
                <small class="shortcut-btn__hint">{{ item.description }}</small>
              </button>
            </div>
          </article>

          <article class="shortcuts-group shortcuts-group--power">
            <h3>
              <UIcon name="i-lucide-power" />
              Akcje z potwierdzeniem
            </h3>
            <div class="shortcuts-power-row">
              <button
                v-for="item in powerButtons"
                :key="item.id"
                type="button"
                class="shortcut-btn shortcut-btn--danger"
                @click="handleAction(item)"
              >
                <span class="shortcut-btn__label">{{ item.label }}</span>
                <small class="shortcut-btn__hint">{{ item.description }}</small>
              </button>
            </div>
          </article>
        </div>
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
}

.shortcuts-overlay__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 15%, rgba(40, 180, 160, 0.26), transparent 45%),
    radial-gradient(circle at 82% 78%, rgba(75, 125, 230, 0.26), transparent 42%),
    rgba(5, 10, 18, 0.56);
  backdrop-filter: blur(18px) saturate(138%);
  -webkit-backdrop-filter: blur(18px) saturate(138%);
}

.shortcuts-panel {
  position: relative;
  width: min(1160px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(185, 217, 255, 0.22);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(14, 28, 43, 0.93), rgba(13, 21, 33, 0.9)), rgba(12, 23, 36, 0.78);
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px rgba(255, 255, 255, 0.07);
  padding: 22px;
  color: #e6f4ff;
}

.shortcuts-panel__close {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  background: rgba(16, 28, 43, 0.75);
  color: #e6f4ff;
  width: 30px;
  height: 30px;
  cursor: pointer;
}

.shortcuts-panel__header h2 {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.shortcuts-panel__header p {
  margin: 10px 0 0;
  opacity: 0.84;
  font-size: 0.92rem;
}

.shortcuts-layout {
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 1fr);
  gap: 16px;
}

.shortcuts-side {
  display: grid;
  grid-template-rows: auto auto;
  gap: 16px;
}

.shortcuts-group {
  border: 1px solid rgba(182, 215, 255, 0.2);
  border-radius: 16px;
  padding: 14px 14px 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02));
}

.shortcuts-group h3 {
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.shortcuts-group--shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shortcuts-group--shortcuts h3 {
  grid-column: 1 / -1;
  margin-bottom: 4px;
}

.shortcuts-folder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shortcuts-power-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shortcut-btn {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(132, 205, 255, 0.56);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(20, 58, 93, 0.64), rgba(12, 38, 62, 0.6));
  color: #f2fbff;
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
  font-weight: 700;
}

.shortcut-btn__label--kbd {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em;
}

.shortcut-btn__hint {
  display: block;
  margin-top: 4px;
  color: rgba(233, 246, 255, 0.75);
  font-size: 0.75rem;
  line-height: 1.35;
}

.shortcut-btn:hover,
.shortcut-btn:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(182, 234, 255, 0.95);
  background: linear-gradient(180deg, rgba(28, 78, 124, 0.78), rgba(18, 56, 90, 0.74));
  box-shadow: 0 8px 16px rgba(7, 21, 36, 0.4);
  outline: none;
}

.shortcut-btn--compact {
  min-height: 74px;
}

.shortcut-btn--danger {
  border-color: rgba(255, 171, 171, 0.78);
  background: linear-gradient(180deg, rgba(110, 26, 26, 0.7), rgba(78, 18, 18, 0.66));
}

.shortcut-btn--danger:hover,
.shortcut-btn--danger:focus-visible {
  border-color: rgba(255, 189, 189, 1);
  background: linear-gradient(180deg, rgba(146, 35, 35, 0.82), rgba(98, 24, 24, 0.76));
}

@media (max-width: 1024px) {
  .shortcuts-layout {
    grid-template-columns: 1fr;
  }

  .shortcuts-power-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
    gap: 10px;
  }

  .shortcuts-group--shortcuts,
  .shortcuts-folder-grid,
  .shortcuts-power-row {
    grid-template-columns: 1fr;
  }
}
</style>
