<script setup lang="ts">
import { useSettingsPageContext } from './settingsPageContext'

const ctx = useSettingsPageContext()
const { deviceName, isAuthenticated, currentUser, appVersion } = ctx
</script>

<template>
  <section id="settings-info" class="settings-dc__section">
    <h2 class="settings-dc__section-title">{{ $t('settingsPage.sectionInfo') }}</h2>
    <div class="settings-dc__stack">
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.displayName') }}</label>
        <template v-if="isAuthenticated && currentUser">
          <input
            class="field__input"
            type="text"
            :value="currentUser.nickname"
            disabled
            spellcheck="false"
          />
          <p class="field__hint">{{ $t('settingsPage.displayNameReadonly') }}</p>
        </template>
        <template v-else>
          <p class="field__hint field__hint--solo">{{ $t('settingsPage.displayNameGuestHint') }}</p>
        </template>
      </div>
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.deviceName') }}</label>
        <input class="field__input" type="text" :value="deviceName" disabled spellcheck="false" />
      </div>
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.currentVersion') }}</label>
        <p class="field__value">{{ appVersion || '—' }}</p>
      </div>
    </div>
  </section>
</template>
