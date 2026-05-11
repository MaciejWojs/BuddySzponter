<script setup lang="ts">
import GuestForm from '@renderer/components/forms/GuestForm.vue'
import HostForm from '@renderer/components/forms/HostForm.vue'
import MenuAppShell from '@renderer/components/menu/MenuAppShell.vue'
import WidgetWrapper from '@renderer/components/UI/WidgetWrapper.vue'
import IncomingRequestWidget from '@renderer/components/widgets/IncomingRequestWidget.vue'
import { useSocketStore } from '@renderer/stores/socketStore'

const socketStore = useSocketStore()
</script>

<template>
  <MenuAppShell>
    <div class="menu-home-grid">
      <article class="menu-column">
        <h2>{{ $t('guestForm.title') }}</h2>
        <p>{{ $t('guestForm.description') }}</p>
        <GuestForm />
      </article>

      <article
        class="menu-column"
        :class="{ 'menu-column--incoming': socketStore.incomingRequest }"
      >
        <WidgetWrapper>
          <div
            v-if="!socketStore.incomingRequest"
            key="host-form"
            class="flex w-full flex-col items-center"
          >
            <h2>{{ $t('hostForm.title') }}</h2>
            <p>{{ $t('hostForm.description') }}</p>
            <HostForm />
          </div>
          <IncomingRequestWidget v-else key="incoming-request" />
        </WidgetWrapper>
      </article>
    </div>
  </MenuAppShell>
</template>

<style scoped>
.menu-home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(300px, 1fr));
  align-items: stretch;
  justify-content: center;
  gap: 120px;
  width: 100%;
  flex: 1;
  min-height: 0;
  padding-top: 0;
}

.menu-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Wąska kolumna „Host” rozciąga się do wysokości bloku Join session — widget jest wyśrodkowany pionowo obok formularza */
.menu-column--incoming {
  justify-content: center;
}

.menu-column h2 {
  font-size: 35px;
  margin-bottom: 4px;
}

.menu-column p {
  font-size: 18px;
  opacity: 0.85;
  margin-bottom: 18px;
}

@media (max-width: 1100px) {
  .menu-home-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    align-self: start;
    padding-top: 10px;
  }

  .menu-column h2 {
    font-size: 24px;
  }

  .menu-column p {
    font-size: 14px;
  }
}

@media (max-width: 600px) {
  .menu-home-grid {
    gap: 18px;
    padding-top: 4px;
  }

  .menu-column h2 {
    font-size: 18px;
  }

  .menu-column p {
    font-size: 12px;
  }
}
</style>
