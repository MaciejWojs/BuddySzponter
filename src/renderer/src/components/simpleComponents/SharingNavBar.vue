<template>
  <section class="shortcuts-overlay" aria-label="Menu skrótów systemowych">
    <div class="shortcuts-overlay__backdrop" />

    <div class="shortcuts-panel">
      <header class="shortcuts-panel__header">
        <h2>Skróty systemowe</h2>
        <p>Kliknij napis lub obwódkę przycisku. Na razie akcje tylko logują użycie.</p>
      </header>

      <div class="shortcuts-grid">
        <article class="shortcuts-group">
          <h3>Skróty klawiaturowe</h3>
          <button
            v-for="item in shortcutButtons"
            :key="item.id"
            type="button"
            class="shortcut-btn"
            @click="handleAction(item)"
          >
            <span class="shortcut-btn__label">{{ item.label }}</span>
            <small class="shortcut-btn__hint">{{ item.description }}</small>
          </button>
        </article>

        <article class="shortcuts-group">
          <h3>Akcje z potwierdzeniem</h3>
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
        </article>

        <article class="shortcuts-group">
          <h3>Foldery</h3>
          <button
            v-for="item in folderButtons"
            :key="item.id"
            type="button"
            class="shortcut-btn"
            @click="handleAction(item)"
          >
            <span class="shortcut-btn__label">{{ item.label }}</span>
            <small class="shortcut-btn__hint">{{ item.description }}</small>
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type MenuAction = {
  id: string
  label: string
  description: string
  requiresConfirmation?: boolean
}

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
</script>

<style scoped>
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
    radial-gradient(circle at 10% 10%, rgba(64, 176, 166, 0.22), transparent 45%),
    radial-gradient(circle at 90% 80%, rgba(243, 156, 18, 0.2), transparent 40%),
    rgba(8, 14, 26, 0.45);
  backdrop-filter: blur(14px) saturate(125%);
  -webkit-backdrop-filter: blur(14px) saturate(125%);
}

.shortcuts-panel {
  position: relative;
  width: min(1080px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 20px;
  background: rgba(12, 23, 36, 0.78);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.45);
  padding: 20px;
  color: #e6f4ff;
}

.shortcuts-panel__header h2 {
  margin: 0;
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.shortcuts-panel__header p {
  margin: 8px 0 0;
  opacity: 0.86;
  font-size: 0.96rem;
}

.shortcuts-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.shortcuts-group {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
}

.shortcuts-group h3 {
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 700;
}

.shortcut-btn {
  width: 100%;
  margin-top: 9px;
  text-align: left;
  border: 1px solid rgba(127, 204, 255, 0.6);
  border-radius: 12px;
  background: rgba(11, 35, 59, 0.62);
  color: #f2fbff;
  padding: 11px 12px;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.shortcut-btn__label {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
}

.shortcut-btn__hint {
  display: block;
  margin-top: 4px;
  color: rgba(233, 246, 255, 0.75);
  font-size: 0.78rem;
  line-height: 1.35;
}

.shortcut-btn:hover,
.shortcut-btn:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(182, 234, 255, 0.95);
  background: rgba(16, 58, 95, 0.72);
  outline: none;
}

.shortcut-btn--danger {
  border-color: rgba(255, 152, 152, 0.8);
  background: rgba(76, 13, 13, 0.58);
}

.shortcut-btn--danger:hover,
.shortcut-btn--danger:focus-visible {
  border-color: rgba(255, 189, 189, 1);
  background: rgba(116, 23, 23, 0.78);
}

@media (max-width: 1024px) {
  .shortcuts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .shortcuts-overlay {
    padding: 12px;
  }

  .shortcuts-panel {
    padding: 14px;
    border-radius: 14px;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
