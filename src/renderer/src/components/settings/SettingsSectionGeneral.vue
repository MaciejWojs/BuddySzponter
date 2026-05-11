<script setup lang="ts">
import BuLanguageSelector from '@renderer/components/simpleComponents/BuLanguageSelector.vue'
import { useSettingsPageContext } from './settingsPageContext'

const ctx = useSettingsPageContext()
const { openAtLogin, closeToTray, themeMode, downloadPath } = ctx
</script>

<template>
  <section id="settings-general" class="settings-dc__section">
    <h2 class="settings-dc__section-title">{{ $t('settingsPage.sectionGeneral') }}</h2>
    <div class="settings-dc__stack">
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.language') }}</label>
        <div class="field__lang">
          <BuLanguageSelector :size="28" />
        </div>
      </div>

      <div class="field field--row">
        <span id="sw-autostart-label" class="field__label">{{ $t('settingsPage.autostart') }}</span>
        <label class="ui-switch">
          <input
            id="sw-autostart"
            v-model="openAtLogin"
            type="checkbox"
            class="ui-switch__native"
            role="switch"
            aria-labelledby="sw-autostart-label"
            @change="void ctx.onOpenAtLoginChange(openAtLogin)"
          />
          <span class="ui-switch__rail" aria-hidden="true"><span class="ui-switch__thumb" /></span>
        </label>
      </div>

      <div class="field field--row">
        <span id="sw-tray-label" class="field__label">{{ $t('settingsPage.closeToTray') }}</span>
        <label class="ui-switch">
          <input
            id="sw-tray"
            v-model="closeToTray"
            type="checkbox"
            class="ui-switch__native"
            role="switch"
            aria-labelledby="sw-tray-label"
            @change="void ctx.onCloseToTrayChange(closeToTray)"
          />
          <span class="ui-switch__rail" aria-hidden="true"><span class="ui-switch__thumb" /></span>
        </label>
      </div>

      <div class="field">
        <label class="field__label">{{ $t('settingsPage.theme') }}</label>
        <div class="theme-row">
          <button
            type="button"
            class="ui-btn ui-btn--sm"
            :class="themeMode === 'dark' ? 'ui-btn--primary' : 'ui-btn--outline'"
            @click="ctx.onThemeChange('dark')"
          >
            {{ $t('settingsPage.themeDark') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn--sm"
            :class="themeMode === 'light' ? 'ui-btn--primary' : 'ui-btn--outline'"
            @click="ctx.onThemeChange('light')"
          >
            {{ $t('settingsPage.themeLight') }}
          </button>
        </div>
      </div>

      <div class="divider" />

      <label class="field__label" for="p2p-download-path">{{
        $t('settingsPage.downloadPathLabel')
      }}</label>
      <p class="field__hint">{{ $t('settingsPage.downloadPathHint') }}</p>
      <div class="field__row">
        <input
          id="p2p-download-path"
          v-model="downloadPath"
          class="field__input"
          type="text"
          spellcheck="false"
          autocomplete="off"
        />
        <button type="button" class="ui-btn ui-btn--sm ui-btn--outline" @click="ctx.pickFolder">
          {{ $t('settingsPage.pickFolder') }}
        </button>
      </div>
      <button
        type="button"
        class="ui-btn ui-btn--sm ui-btn--primary mt-2 self-start"
        @click="ctx.savePath"
      >
        {{ $t('settingsPage.save') }}
      </button>
    </div>
  </section>
</template>
