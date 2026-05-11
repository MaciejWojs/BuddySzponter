<template>
  <section
    id="settings-video"
    class="settings-dc__section settings-dc__section--muted"
    aria-disabled="true"
  >
    <h2 class="settings-dc__section-title">{{ $t('settingsPage.sectionVideo') }}</h2>
    <div class="settings-dc__stack">
      <div class="field field--row">
        <label class="field__label">{{ $t('settingsPage.recordingEnabled') }}</label>
        <label class="ui-switch ui-switch--disabled">
          <input
            type="checkbox"
            class="ui-switch__native"
            role="switch"
            :checked="false"
            disabled
          />
          <span class="ui-switch__rail" aria-hidden="true"><span class="ui-switch__thumb" /></span>
        </label>
      </div>
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.recordingQuality') }}</label>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--outline" disabled>
          {{ $t('settingsPage.recordingQualityPlaceholder') }}
        </button>
      </div>
      <div class="field">
        <label class="field__label">{{ $t('settingsPage.recordingPath') }}</label>
        <div class="field__row">
          <input class="field__input" type="text" disabled value="—" />
          <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" disabled>
            {{ $t('settingsPage.changeFolder') }}
          </button>
        </div>
      </div>
      <div class="field field--row">
        <label class="field__label">{{ $t('settingsPage.autoRecording') }}</label>
        <label class="ui-switch ui-switch--disabled">
          <input type="checkbox" class="ui-switch__native" role="switch" :checked="true" disabled />
          <span class="ui-switch__rail" aria-hidden="true"><span class="ui-switch__thumb" /></span>
        </label>
      </div>
      <div class="field field--row">
        <label class="field__label">{{ $t('settingsPage.recordingMic') }}</label>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--outline" disabled>
          {{ $t('settingsPage.defaultOption') }}
        </button>
      </div>
      <div class="field field--row">
        <label class="field__label">{{ $t('settingsPage.recordingSound') }}</label>
        <button type="button" class="ui-btn ui-btn--sm ui-btn--outline" disabled>
          {{ $t('settingsPage.defaultOption') }}
        </button>
      </div>
      <p class="field__hint">{{ $t('settingsPage.videoSectionHint') }}</p>
    </div>
  </section>
</template>
