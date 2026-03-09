<script setup lang="ts">
import { computed, onBeforeUnmount, PropType, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'copied', value: string): void
  (event: 'blur', value: FocusEvent): void
}>()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '250px'
  },
  error: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fontFamily: {
    type: String as PropType<'mono' | 'sans'>,
    default: 'mono'
  },
  fontSize: {
    type: String,
    default: '1rem'
  },
  textAlign: {
    type: String as PropType<'left' | 'center' | 'right'>,
    default: 'left'
  },
  copyOnClick: {
    type: Boolean,
    default: false
  },
  showCopyPopover: {
    type: Boolean,
    default: false
  },
  copyPopoverText: {
    type: String,
    default: ''
  },
  copyPopoverDuration: {
    type: Number,
    default: 1200
  }
})

const { t } = useI18n()

const isCopyPopoverOpen = ref(false)
let copyPopoverTimeout: ReturnType<typeof setTimeout> | null = null

const fontFamilyMap = {
  mono: "'JetBrains Mono', monospace",
  sans: "'Plus Jakarta Sans', sans-serif"
} as const

const inputStyle = computed(() => ({
  fontFamily: fontFamilyMap[props.fontFamily],
  fontSize: props.fontSize,
  textAlign: props.textAlign,
  cursor: props.copyOnClick && !props.disabled ? 'copy' : undefined
}))

const resolvedCopyPopoverText = computed(() => props.copyPopoverText || t('Alert.copy'))

function onInput(event: Event): void {
  if (props.readonly || props.disabled) return
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function onBlur(event: FocusEvent): void {
  emit('blur', event)
}

async function onClick(): Promise<void> {
  if (!props.copyOnClick || props.disabled) return

  const text = props.modelValue
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    emit('copied', text)

    if (!props.showCopyPopover) return

    isCopyPopoverOpen.value = true

    if (copyPopoverTimeout) {
      clearTimeout(copyPopoverTimeout)
    }

    copyPopoverTimeout = setTimeout(() => {
      isCopyPopoverOpen.value = false
    }, props.copyPopoverDuration)
  } catch {
    // Keep UI responsive even when clipboard access is blocked.
  }
}

function onPopoverOpenChange(value: boolean): void {
  // Keep popover fully controlled: do not auto-open on trigger click.
  if (!props.showCopyPopover) {
    isCopyPopoverOpen.value = false
    return
  }

  if (!value) {
    isCopyPopoverOpen.value = false
  }
}

onBeforeUnmount(() => {
  if (copyPopoverTimeout) {
    clearTimeout(copyPopoverTimeout)
  }
})
</script>
<template>
  <UPopover
    :open="isCopyPopoverOpen"
    :content="{ side: 'right', sideOffset: 6 }"
    :dismissible="true"
    @update:open="onPopoverOpenChange"
  >
    <div
      class="bu-input-wrapper"
      :class="{
        'bu-input-error': props.error,
        shake: props.error,
        'bu-input-normal': !props.error
      }"
      :style="{ width: props.width }"
    >
      <div v-if="$slots.prefix" class="prefix-wrapper">
        <span class="bu-input-icon">
          <slot name="prefix" />
        </span>
      </div>
      <input
        :type="props.type"
        :placeholder="props.placeholder"
        :value="props.modelValue"
        :readonly="props.readonly"
        :disabled="props.disabled"
        :style="inputStyle"
        @input="onInput"
        @click="onClick"
        @blur="onBlur"
      />
      <div v-if="$slots.suffix" class="suffix-wrapper">
        <span class="bu-input-icon">
          <slot name="suffix" />
        </span>
      </div>
    </div>

    <template #content>
      <div
        v-if="props.showCopyPopover"
        class="copy-popover-content bg-neutral-800 text-white border-0 border-amber-300 p-5 rounded shadow-lg"
      >
        {{ resolvedCopyPopoverText }}
      </div>
    </template>
  </UPopover>
</template>
<style>
.shake {
  animation: shake 0.5s;
}
@keyframes shake {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
  100% {
    transform: translateX(0);
  }
}
.prefix-wrapper {
  display: flex;
  align-items: center;
  margin-right: 8px;
}
.suffix-wrapper {
  display: flex;
  align-items: center;
  margin-left: 8px;
}
.bu-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #06001f;
  border-radius: 10px;
  padding: 0 10px;
  box-shadow: 0 0px 5px rgba(255, 255, 255, 0.158);
}
.bu-input-error {
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
  box-shadow: 0 2px 12px rgba(255, 0, 0, 0.3);
  border: 1px solid #ff4d4f;
}
.bu-input-error:focus-within {
  outline: red 2px solid;
}
.bu-input-normal:focus-within {
  outline: var(--color-accent) 2px solid;
}
.bu-input-icon {
  display: flex;
  align-items: center;
  font-size: 1.2em;
}
input {
  background: transparent;
  color: white;
  padding: 10px 0;
  border: none;
  outline: none;
  flex: 1;
  width: 100%;
}
input:focus {
  outline: none;
}
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
input[readonly] {
  cursor: default;
}
.copy-popover-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  padding: 4px 8px;
}
</style>
