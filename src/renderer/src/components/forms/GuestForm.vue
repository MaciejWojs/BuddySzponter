<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import * as z from 'zod'
import { parseHostSessionShareClipboard } from '@renderer/utils/parseHostSessionShareClipboard'
import { useAppToast } from '@renderer/composables/useAppToast'
import { useGuestFixedSessionToast } from '@renderer/composables/guestFixedSessionToast'
import { translatedGuestJoinFailureMessage } from '@renderer/utils/guestJoinFailureMessage'

const { t } = useI18n()
const { error: toastError } = useAppToast()
const { showGuestFixedSessionToast } = useGuestFixedSessionToast()
const connectionStore = useConnectionStore()
const socketStore = useSocketStore()

const passwordValidator = computed(() =>
  toTypedSchema(
    z.object({
      sessionCode: z
        .string({ message: t('validation.required') })
        .min(1, { message: t('validation.required') })
        .refine((value) => value.replace(/\s/g, '').length === 8, {
          message: t('validation.sessioncodelength')
        }),
      sessionPassword: z.string({ message: t('validation.required') })
    })
  )
)

const { errors, defineField, validateField, setFieldError, handleSubmit } = useForm({
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
const isApiLoading = ref(false)

const clipboardShareOffer = ref<{ codeFormatted: string; password: string } | null>(null)

watch(sessionCode, (value) => {
  const charsOnly = (value ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)

  const formattedValue = charsOnly.replace(/(.{4})(?=.)/g, '$1 ')

  if (formattedValue !== value) {
    sessionCode.value = formattedValue
    return
  }

  if (!charsOnly.length) {
    setFieldError('sessionCode', undefined)
    return
  }

  validateSessionCodeDebounced()
})

watch(sessionPassword, () => {
  validateSessionPasswordDebounced()
})

function onTogglePasswordVisibility(): void {
  show.value = !show.value
  validateSessionPasswordDebounced()
}

const isConnecting = computed(() => socketStore.isConnected && !connectionStore.isHost)

const onSubmit = handleSubmit(async () => {
  const rawCode = (sessionCode.value ?? '').replace(/\s/g, '')
  const rawPassword = sessionPassword.value ?? ''

  isApiLoading.value = true

  try {
    const res = await connectionStore.joinGuestConnection({
      connectionCode: rawCode,
      password: rawPassword
    })

    if (res && !res.success) {
      const msg = translatedGuestJoinFailureMessage(res.message, t)
      showGuestFixedSessionToast(msg)
    }
  } catch (error) {
    console.error('Błąd połączenia:', error)
    showGuestFixedSessionToast(t('guestForm.joinErrorCritical'))
  } finally {
    isApiLoading.value = false
  }
})

watch(
  () => socketStore.isConnected,
  (connected, wasConnected) => {
    if (wasConnected && !connected && connectionStore.connectionCode) {
      showGuestFixedSessionToast(t('guestForm.joinErrorDisconnected'))
    }
  }
)

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
  if (hasModifier && isEditShortcut) return
  if (/^[a-zA-Z0-9]$/.test(event.key)) return

  event.preventDefault()
}

function tryHandleSharePaste(pastedText: string, event: ClipboardEvent): boolean {
  const parsed = parseHostSessionShareClipboard(pastedText)
  if (!parsed) return false

  event.preventDefault()
  const codeFormatted = parsed.codeRaw.replace(/(.{4})(?=.)/g, '$1 ')
  clipboardShareOffer.value = {
    codeFormatted,
    password: parsed.password
  }
  return true
}

function onSessionCodePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text') ?? ''
  if (tryHandleSharePaste(pastedText, event)) return

  event.preventDefault()
  const charsOnly = pastedText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  if (!charsOnly) return

  sessionCode.value = charsOnly.replace(/(.{4})(?=.)/g, '$1 ')
  validateSessionCodeDebounced()
}

function onPasswordPaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text') ?? ''
  if (tryHandleSharePaste(pastedText, event)) return

  event.preventDefault()
  sessionPassword.value = pastedText.trim()
  validateSessionPasswordDebounced()
}

function applyClipboardShare(): void {
  const offer = clipboardShareOffer.value
  if (!offer) return

  sessionCode.value = offer.codeFormatted
  sessionPassword.value = offer.password
  clipboardShareOffer.value = null
  void validateField('sessionCode')
  void validateField('sessionPassword')
}

function cancelClipboardShare(): void {
  clipboardShareOffer.value = null
}

async function onPasteFromClipboardButton(): Promise<void> {
  let text = ''
  try {
    text = await navigator.clipboard.readText()
  } catch {
    toastError('guestForm.clipboardReadFailedTitle', 'guestForm.clipboardReadFailedDescription')
    return
  }

  const parsed = parseHostSessionShareClipboard(text)
  if (parsed) {
    sessionCode.value = parsed.codeRaw.replace(/(.{4})(?=.)/g, '$1 ')
    sessionPassword.value = parsed.password
    clipboardShareOffer.value = null
    void validateField('sessionCode')
    void validateField('sessionPassword')
    return
  }

  showGuestFixedSessionToast(t('guestForm.clipboardFormatNotRecognized'))
}

function onSessionCodeBlur(): void {
  validateSessionCodeDebounced()
}

function onPasswordBlur(): void {
  validateSessionPasswordDebounced()
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="w-full max-w-[320px] mx-auto mb-3 flex justify-center">
      <UButton
        type="button"
        icon="i-lucide-clipboard-paste"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="isConnecting || isApiLoading"
        @click="onPasteFromClipboardButton"
      >
        {{ t('guestForm.pasteFromClipboard') }}
      </UButton>
    </div>

    <div
      v-if="(connectionStore.connectionCode || isApiLoading) && !connectionStore.isHost"
      class="w-full mb-6 text-center max-w-[320px] mx-auto transition-all"
    >
      <div
        v-if="socketStore.isConnected && socketStore.isAcknowledged"
        class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
      >
        <p class="text-xs text-emerald-400 font-bold m-0">
          Połączono z sesją: {{ connectionStore.connectionCode }}
        </p>
      </div>

      <div
        v-else-if="socketStore.isConnected && !socketStore.isAcknowledged"
        class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse"
      >
        <p class="text-xs text-blue-400 font-bold m-0">Pukamy... Oczekiwanie na akceptację Hosta</p>
      </div>

      <div
        v-else-if="isApiLoading"
        class="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg animate-pulse"
      >
        <p class="text-xs text-gray-400 font-bold m-0">Weryfikacja kodu i hasła...</p>
      </div>
    </div>

    <div
      v-if="clipboardShareOffer && !isConnecting && !isApiLoading"
      class="w-full mb-4 max-w-[320px] mx-auto p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col gap-2"
    >
      <p class="text-xs text-amber-200 font-medium m-0 text-center">
        {{ t('guestForm.clipboardShareDetected') }}
      </p>
      <div class="flex flex-wrap gap-2 justify-center">
        <UButton color="primary" size="sm" @click="applyClipboardShare">
          {{ t('guestForm.applyClipboardShare') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" @click="cancelClipboardShare">
          {{ t('guestForm.clipboardShareCancel') }}
        </UButton>
      </div>
    </div>

    <div id="sessionCode" class="flex flex-col items-center">
      <h3>{{ $t('guestForm.sessionCode') }}</h3>
      <BuInput
        v-model="sessionCode"
        v-bind="sessionCodeAttrs"
        :error="!!errors.sessionCode"
        :disabled="isConnecting || isApiLoading"
        text-align="center"
        font-family="mono"
        font-size="20px"
        maxlength="9"
        @keydown="onSessionCodeKeydown"
        @paste="onSessionCodePaste"
        @blur="onSessionCodeBlur"
      />
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionCode }}</div>
    </div>

    <div id="sessionPassword" class="flex flex-col items-center">
      <h3>{{ $t('guestForm.sessionPassword') }}</h3>
      <BuInput
        v-model="sessionPassword"
        v-bind="sessionPasswordAttrs"
        :type="show ? 'text' : 'password'"
        :error="!!errors.sessionPassword"
        :disabled="isConnecting || isApiLoading"
        text-align="left"
        font-family="mono"
        font-size="20px"
        @paste="onPasswordPaste"
        @blur="onPasswordBlur"
      >
        <template #suffix>
          <div class="flex flex-row items-center">
            <UButton
              :icon="!show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              class="text-white opacity-50"
              :aria-label="show ? t('common.hidePassword') : t('common.showPassword')"
              :aria-pressed="show"
              @click="onTogglePasswordVisibility"
            />
          </div>
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionPassword }}</div>
    </div>

    <div class="flex justify-center" style="margin-top: 44px">
      <GrayButton
        type="submit"
        :disabled="
          isConnecting ||
          isApiLoading ||
          !sessionCode ||
          !sessionPassword ||
          !!errors.sessionCode ||
          !!errors.sessionPassword
        "
      >
        {{ isConnecting || isApiLoading ? 'Uwierzytelnianie...' : $t('guestForm.joinButton') }}
      </GrayButton>
    </div>
  </form>
</template>

<style lang="scss" scoped></style>
