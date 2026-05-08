<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import * as z from 'zod'

const { t } = useI18n()
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
const rejectMessage = ref<string | null>(null)

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
  rejectMessage.value = null

  try {
    const res = await connectionStore.joinGuestConnection({
      connectionCode: rawCode,
      password: rawPassword
    })

    if (res && !res.success) {
      rejectMessage.value = res.message || 'Odmowa dostępu. Błędny kod lub hasło.'
      setFieldError('sessionCode', rejectMessage.value)
    }
  } catch (error) {
    console.error('Błąd połączenia:', error)
    rejectMessage.value = 'Krytyczny błąd połączenia z serwerem.'
  } finally {
    isApiLoading.value = false
  }
})

watch(
  () => socketStore.isConnected,
  (connected, wasConnected) => {
    if (wasConnected && !connected && connectionStore.connectionCode) {
      rejectMessage.value = 'Połączenie zostało zerwane.'
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

function onSessionCodePaste(event: ClipboardEvent): void {
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text') ?? ''
  const charsOnly = pastedText.replace(/[^a-zA-Z0-9]/g, '')
  if (!charsOnly) return

  const currentChars = (sessionCode.value ?? '').replace(/[^a-zA-Z0-9]/g, '')
  const nextChars = `${currentChars}${charsOnly}`.slice(0, 8)
  sessionCode.value = nextChars.replace(/(.{4})(?=.)/g, '$1 ')
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
    <div
      v-if="
        (connectionStore.connectionCode || isApiLoading || rejectMessage) && !connectionStore.isHost
      "
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

      <div
        v-else-if="rejectMessage"
        class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg"
      >
        <p class="text-xs text-rose-400 font-bold m-0">{{ rejectMessage }}</p>
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
        class="uppercase"
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
