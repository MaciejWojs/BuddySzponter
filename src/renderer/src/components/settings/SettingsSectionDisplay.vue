<script setup lang="ts">
import { useSettingsPageContext } from './settingsPageContext'

const ctx = useSettingsPageContext()
const {
  shouldUseCpuHint,
  captureBackend,
  activeVideoQuality,
  advancedOpen,
  advBitrateKbps,
  advFps
} = ctx
const captureModeLabel = ctx.captureModeLabel
const qualityPresets = ctx.qualityPresets

const onAdvancedToggle = (e: Event): void => {
  const el = e.target as HTMLDetailsElement
  advancedOpen.value = el.open
}
</script>

<template>
  <section id="settings-display" class="settings-dc__section">
    <h2 class="settings-dc__section-title">{{ $t('settingsPage.sectionDisplay') }}</h2>
    <div class="settings-dc__stack">
      <div class="field">
        <div class="field__row">
          <label class="field__label">{{ $t('settingsPage.hwAccel') }}</label>
          <label class="ui-switch ui-switch--disabled">
            <input
              type="checkbox"
              class="ui-switch__native"
              role="switch"
              :checked="shouldUseCpuHint === false"
              disabled
            />
            <span class="ui-switch__rail" aria-hidden="true"
              ><span class="ui-switch__thumb"
            /></span>
          </label>
        </div>
        <p class="field__hint">{{ $t('settingsPage.hwAccelHint') }}</p>
        <p class="field__meta">{{ $t('settingsPage.capturePathLabel') }}: {{ captureModeLabel }}</p>
      </div>

      <div class="field">
        <label class="field__label" for="capture-backend">{{
          $t('settingsPage.captureBackend')
        }}</label>
        <select
          id="capture-backend"
          v-model="captureBackend"
          class="field__input field__input--select"
          @change="void ctx.persistCaptureBackend()"
        >
          <option value="auto">{{ $t('settingsPage.captureBackendAuto') }}</option>
          <option value="gdi">{{ $t('settingsPage.captureBackendGdi') }}</option>
          <option value="dxgi">{{ $t('settingsPage.captureBackendDxgi') }}</option>
          <option value="winrt">{{ $t('settingsPage.captureBackendWinrt') }}</option>
        </select>
        <p class="field__hint">{{ $t('settingsPage.captureBackendHint') }}</p>
      </div>

      <div class="field">
        <label class="field__label">{{ $t('settingsPage.connectionQuality') }}</label>
        <div class="preset-row">
          <button
            v-for="p in qualityPresets"
            :key="p.id"
            type="button"
            class="preset-row__btn ui-btn ui-btn--sm"
            :class="{ 'ui-btn--preset-active': activeVideoQuality === p.id }"
            @click="ctx.onQualityPresetClick($event, p.id)"
          >
            {{ $t(p.labelKey) }}
          </button>
        </div>
      </div>

      <details class="advanced" :open="advancedOpen" @toggle="onAdvancedToggle">
        <summary class="advanced__summary">{{ $t('settingsPage.advancedTitle') }}</summary>
        <div class="advanced__body">
          <div class="field field--inline">
            <label class="field__label" for="adv-bitrate">{{
              $t('settingsPage.advancedBitrate')
            }}</label>
            <input
              id="adv-bitrate"
              v-model.number="advBitrateKbps"
              class="field__input field__input--narrow"
              type="number"
              min="200"
              max="50000"
            />
          </div>
          <div class="field field--inline">
            <label class="field__label" for="adv-fps">{{ $t('settingsPage.advancedFps') }}</label>
            <input
              id="adv-fps"
              v-model.number="advFps"
              class="field__input field__input--narrow"
              type="number"
              min="1"
              max="240"
            />
          </div>
          <button
            type="button"
            class="ui-btn ui-btn--sm ui-btn--primary"
            @click="ctx.applyAdvancedLimits"
          >
            {{ $t('settingsPage.advancedApply') }}
          </button>
        </div>
      </details>
    </div>
  </section>
</template>
