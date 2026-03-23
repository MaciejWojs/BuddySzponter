<script lang="ts" setup>
import { ref } from 'vue'

const { t } = useI18n()

const passwordValidator = computed(() =>
  toTypedSchema(
    z.object({
      sessionCode: z
        .string({ message: t('validation.required') })
        .min(1, { message: t('validation.required') })
        .refine((value) => value.replace(/\s/g, '').length === 9, {
          message: t('validation.sessionCodeLength')
        }),
      sessionPassword: z.string({ message: t('validation.required') })
    })
  )
)

const { errors, defineField, validateField, setFieldError } = useForm({
  validationSchema: passwordValidator
})

const validateSessionPasswordDebounced = useDebounceFn(() => {
  void validateField('sessionPassword')
}, 150)

const validateSessionCodeDebounced = useDebounceFn(() => {
  void validateField('sessionCode')
}, 150)

const [sessionCode, sessionCodeAttrs] = defineField('sessionCode', {
  validateOnModelUpdate: false,
  validateOnBlur: false
})

const [sessionPassword, sessionPasswordAttrs] = defineField('sessionPassword', {
  validateOnModelUpdate: false,
  validateOnBlur: false
})

const show = ref(false)

watch(sessionCode, (value) => {
  const digitsOnly = (value ?? '').replace(/\D/g, '').slice(0, 9)
  const formattedValue = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ')

  if (formattedValue !== value) {
    sessionCode.value = formattedValue
    return
  }

  if (!digitsOnly.length) {
    setFieldError('sessionCode', undefined)
    return
  }

  validateSessionCodeDebounced()
})

watch(sessionPassword, () => {
  validateSessionPasswordDebounced()
})

async function onCopySessionCode(): Promise<void> {
  const value = sessionCode.value ?? ''
  if (!value) return

  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Clipboard might be unavailable in some environments.
  }
}

function onTogglePasswordVisibility(): void {
  show.value = !show.value
  validateSessionPasswordDebounced()
}

function onSessionCodeKeydown(event: KeyboardEvent): void {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ]

  if (allowedKeys.includes(event.key)) return
  const hasModifier = event.ctrlKey || event.metaKey
  const isEditShortcut = ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())
  const isShortcut = hasModifier && isEditShortcut
  if (isShortcut) return
  if (/^\d$/.test(event.key)) return

  event.preventDefault()
}

function onSessionCodePaste(event: ClipboardEvent): void {
  event.preventDefault()

  const pastedText = event.clipboardData?.getData('text') ?? ''
  const digitsOnly = pastedText.replace(/\D/g, '')
  if (!digitsOnly) return

  const currentDigits = (sessionCode.value ?? '').replace(/\D/g, '')
  const nextDigits = `${currentDigits}${digitsOnly}`.slice(0, 9)
  sessionCode.value = nextDigits.replace(/(\d{3})(?=\d)/g, '$1 ')
}

function onSessionCodeBlur(): void {
  validateSessionCodeDebounced()
}

function onPasswordBlur(): void {
  validateSessionPasswordDebounced()
}
</script>

<template>
  <div>
    <div id="sessionCode" class="flex flex-col items-center">
      <h3>{{ $t('guestForm.sessionCode') }}</h3>
      <BuInput
        v-model="sessionCode"
        v-bind="sessionCodeAttrs"
        :error="!!errors.sessionCode"
        text-align="center"
        font-family="mono"
        font-size="20px"
        :copy-on-click="true"
        :show-copy-popover="true"
        maxlength="11"
        inputmode="numeric"
        @keydown="onSessionCodeKeydown"
        @paste="onSessionCodePaste"
        @blur="onSessionCodeBlur"
      >
        <template #suffix>
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="link"
            class="text-white opacity-50"
            aria-label="Copy session code"
            @click="onCopySessionCode"
          />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionCode }}</div>
    </div>
    <div id="sessionPassword" class="flex flex-col items-center">
      <h3>{{ $t('guestForm.sessionPassword') }}</h3>
      <BuInput
        v-model="sessionPassword"
        v-bind="sessionPasswordAttrs"
        :type="show ? 'text' : 'password'"
        :error="!!errors.sessionPassword"
        text-align="left"
        font-family="mono"
        font-size="20px"
        @blur="onPasswordBlur"
      >
        <template #suffix>
          <div class="flex flex-row items-center">
            <UButton
              :icon="!show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              class="text-white opacity-50"
              :aria-label="show ? 'Hide password' : 'Show password'"
              :aria-pressed="show"
              @click="onTogglePasswordVisibility"
            />
          </div>
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionPassword }}</div>
    </div>

    <div class="flex justify-center" style="margin-top: 44px">
      <GrayButton>{{ $t('guestForm.joinButton') }}</GrayButton>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
