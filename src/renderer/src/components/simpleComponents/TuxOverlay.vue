<template>
  <div class="shortcuts-overlay">
    <div class="shortcuts-overlay__backdrop">
      <div class="tux-wrapper">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="tux-svg">
          <path
            d="M256,12C121.2,12,12,121.2,12,256S121.2,500,256,500s244-109.2,244-244S390.8,12,256,12ZM356,220c0,11.2-4.8,20.8-14.4,28.8S321.6,260,312,260h-112c-9.6,0-19.2-4.8-28.8-12.8S156,231.2,156,220c0-26,20.8-48,48-48s48,22,48,48v8h16v-8c0-26,20.8-48,48-48S356,194,356,220ZM256,428c-52.8,0-96-43.2-96-96s43.2-96,96-96,96,43.2,96,96S308.8,428,256,428Z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Tu na razie nie potrzebujemy żadnej logiki,
// ale jakbyś chciał sterować animacją z poziomu JS, to masz gotowy setup!
</script>

<style scoped>
/* Definiujemy zmienne bezpośrednio w komponencie lub dziedziczymy z roota */
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  pointer-events: none;
  --tools-accent-rgb: 167, 73, 252;
  --tools-accent-soft-rgb: 200, 143, 255;
  --tools-bg-1: rgba(10, 5, 22, 0.84);
  --tools-bg-2: rgba(6, 2, 16, 0.8);
  --tools-win-glow-rgb: 60, 40, 120;
  --tools-win-line-rgb: 120, 110, 180;
  --tools-win-shadow-rgb: 30, 20, 60;
}

.shortcuts-overlay__backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(var(--tools-accent-rgb), 0.09), transparent 52%),
    radial-gradient(circle at 82% 75%, rgba(var(--tools-accent-soft-rgb), 0.07), transparent 50%),
    rgba(12, 16, 24, 0.22);
  /* backdrop-filter: blur(10px) saturate(108%); */
  /* -webkit-backdrop-filter: blur(10px) saturate(108%); */
}

/* Plama światła (glow) pod pingwinem - zostawiamy z oryginalnego kodu */
.shortcuts-overlay__backdrop::before {
  content: '';
  position: absolute;
  right: clamp(-120px, -8vw, -60px);
  top: 50%;
  width: clamp(380px, 38vw, 620px);
  aspect-ratio: 1.35 / 1;
  transform: translateY(-50%) skew(-6deg);
  pointer-events: none;
  background:
    radial-gradient(circle at 48% 50%, rgba(var(--tools-win-glow-rgb), 0.22), transparent 62%),
    radial-gradient(circle at 52% 50%, rgba(var(--tools-win-shadow-rgb), 0.13), transparent 78%);
  filter: blur(3px);
  opacity: 0.55;
  animation: windowsGlowPulse 7.2s ease-in-out infinite;
}

/* OPAKOWANIE TUXA - Zamiast ::after z Windowsa */
.tux-wrapper {
  position: absolute;
  right: clamp(12px, 4vw, 64px);
  top: 50%;
  width: clamp(200px, 20vw, 320px);
  aspect-ratio: 1 / 1;
  /* Perspektywa, która robi robotę */
  transform: translateY(-50%) perspective(800px) rotateY(22deg) rotateX(2deg);
  pointer-events: none;
  opacity: 0.8;
  animation: windowsLogoBreath 8.4s ease-in-out infinite;
}

/* STYLIZACJA SAMEGO SVG */
.tux-svg {
  width: 100%;
  height: 100%;
  /* Fioletowe, neonowe wypełnienie */
  fill: rgba(var(--tools-win-line-rgb), 0.6);
  /* Zewnętrzny glow (drop-shadow działa na kształt SVG, a nie na kwadratowy box!) */
  filter: drop-shadow(0 0 25px rgba(var(--tools-win-glow-rgb), 0.6))
    drop-shadow(0 0 60px rgba(var(--tools-win-glow-rgb), 0.4));
  /* Neonowa obwoluta */
  stroke: rgba(var(--tools-win-line-rgb), 0.8);
  stroke-width: 4px; /* Zależnie od viewBoxa, to może wymagać dopasowania */
}

/* --- ANIMACJE --- */
@keyframes windowsGlowPulse {
  0%,
  100% {
    opacity: 0.72;
    transform: translateY(-50%) skew(-6deg) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translateY(-50%) skew(-6deg) scale(1.04);
  }
}

@keyframes windowsLogoBreath {
  0%,
  100% {
    opacity: 0.64;
    filter: brightness(1);
  }
  50% {
    opacity: 0.9; /* Zwiększyłem, żeby pingwin mocniej pulsował */
    filter: brightness(1.15);
  }
}
</style>
