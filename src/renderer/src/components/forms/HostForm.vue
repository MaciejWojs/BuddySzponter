<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import BuTimer from '../simpleComponents/BuTimer.vue'
import zxcvbn from 'zxcvbn'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { connectionService } from '@renderer/composables/connection/connectionService'
import { useI18n } from 'vue-i18n'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { useDebounceFn } from '@vueuse/core'
import * as z from 'zod'

const { t } = useI18n()
const connectionStore = useConnectionStore()

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LETTERS = 64

const hasLowercase = (value: string): boolean => /\p{Ll}/u.test(value)
const hasUppercase = (value: string): boolean => /\p{Lu}/u.test(value)
const hasDigit = (value: string): boolean => /\p{N}/u.test(value)
const hasSpecialCharacter = (value: string): boolean => /[^\p{L}\p{N}]/u.test(value)

function hasRequiredPasswordCharacters(value: string): boolean {
  return hasLowercase(value) && hasUppercase(value) && hasDigit(value) && hasSpecialCharacter(value)
}

const sessionCode = computed(() => connectionStore.connectionCode)

const sessionPassword = computed({
  get: () => connectionStore.connectionPassword,
  set: (val) => {
    connectionStore.connectionPassword = val
  }
})

const passwordValidator = computed(() =>
  toTypedSchema(
    z.object({
      sessionPassword: z
        .string({ message: t('validation.required') })
        .refine((value) => (value.match(/\p{L}/gu) ?? []).length <= PASSWORD_MAX_LETTERS, {
          message: t('validation.passwordMaxLetters', { count: PASSWORD_MAX_LETTERS })
        })
        .refine((value) => value.length < PASSWORD_MIN_LENGTH || hasLowercase(value), {
          message: t('validation.passwordRequiresLowercase')
        })
        .refine((value) => value.length < PASSWORD_MIN_LENGTH || hasUppercase(value), {
          message: t('validation.passwordRequiresUppercase')
        })
        .refine((value) => value.length < PASSWORD_MIN_LENGTH || hasDigit(value), {
          message: t('validation.passwordRequiresDigit')
        })
        .refine((value) => value.length < PASSWORD_MIN_LENGTH || hasSpecialCharacter(value), {
          message: t('validation.passwordRequiresSpecialCharacter')
        })
        .min(PASSWORD_MIN_LENGTH, {
          message: t('validation.passwordMinLength', { count: PASSWORD_MIN_LENGTH })
        })
    })
  )
)

const { errors, defineField, validateField } = useForm({
  validationSchema: passwordValidator
})

const validateSessionPasswordDebounced = useDebounceFn(() => {
  void validateField('sessionPassword')
}, 150)

const [_sessionPasswordModel, sessionPasswordAttrs] = defineField('sessionPassword', {
  validateOnModelUpdate: false,
  validateOnBlur: false
})

const passwordMeetsRequirements = computed(() => {
  const value = sessionPassword.value ?? ''
  const hasValidLength = value.length >= PASSWORD_MIN_LENGTH
  const hasValidLettersCount = (value.match(/\p{L}/gu) ?? []).length <= PASSWORD_MAX_LETTERS

  return hasValidLength && hasValidLettersCount && hasRequiredPasswordCharacters(value)
})

const strong = computed(() => {
  if (!passwordMeetsRequirements.value) return 0
  return zxcvbn(sessionPassword.value ?? '').score
})

const strongProgressColor = computed(() => {
  if (!passwordMeetsRequirements.value) return 'error'
  return strong.value <= 1 ? 'error' : strong.value <= 3 ? 'warning' : 'success'
})

const show = ref(false)
const timer = ref<InstanceType<typeof BuTimer>>()
const time = ref(0)
const totalTimeWindow = ref(120)

const isPasswordChanged = computed(() => {
  return connectionStore.connectionPassword !== connectionStore.activePassword
})

let intervalFrame: number

onMounted(() => {
  if (!connectionStore.isHost) {
    connectionStore.createHostConnection()
  }

  let lastExpiresTime = 0
  let localExpiresAt = 0

  intervalFrame = window.setInterval(() => {
    if (connectionService.connectionExpiresDate) {
      const serverExpiresAt = connectionService.connectionExpiresDate.getTime()

      if (serverExpiresAt !== lastExpiresTime) {
        lastExpiresTime = serverExpiresAt
        totalTimeWindow.value = 120
        localExpiresAt = Date.now() + 120 * 1000
      }

      const remainingTotal = localExpiresAt - Date.now()

      if (remainingTotal >= 0) {
        time.value = Math.max(Math.floor(remainingTotal / 1000), 0)
        if (timer.value) {
          timer.value.start(time.value)
        }
      } else {
        time.value = 0
      }
    }
  }, 1000)
})

onUnmounted(() => {
  window.clearInterval(intervalFrame)
})

watch(
  () => connectionStore.connectionPassword,
  () => {
    _sessionPasswordModel.value = connectionStore.connectionPassword
    validateSessionPasswordDebounced()
  },
  { immediate: true }
)

function onTogglePasswordVisibility(): void {
  show.value = !show.value
  validateSessionPasswordDebounced()
}

function onRandomPasswordClick(): void {
  connectionStore.generateRandomPassword()
  validateSessionPasswordDebounced()
}

function onPasswordBlur(): void {
  validateSessionPasswordDebounced()
}

function applyNewPassword(): void {
  if (passwordMeetsRequirements.value) {
    connectionStore.createHostConnection()
  }
}

function revertNewPassword(): void {
  connectionStore.revertPassword()
  validateSessionPasswordDebounced()
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div id="sessionCode" class="flex flex-col items-center">
      <h3>{{ $t('hostForm.sessionCode') }}</h3>
      <BuInput
        v-model="sessionCode"
        :readonly="true"
        text-align="center"
        font-family="mono"
        font-size="20px"
        :copy-on-click="true"
        :show-copy-popover="true"
      />
    </div>

    <div id="progress" class="w-50">
      <BuProgress type="progress" :model-value="time" :steps="totalTimeWindow" />
    </div>

    <div id="sessionPassword" class="flex flex-col items-center">
      <h3>{{ $t('hostForm.sessionPassword') }}</h3>
      <BuInput
        v-model="sessionPassword"
        v-bind="sessionPasswordAttrs"
        :type="show ? 'text' : 'password'"
        :error="!!errors.sessionPassword"
        text-align="left"
        font-family="mono"
        font-size="20px"
        :copy-on-click="true"
        :show-copy-popover="true"
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
            <UButton
              icon="lucide:dice-1"
              color="neutral"
              variant="link"
              class="text-white opacity-50"
              :aria-label="t('hostForm.generatePassword')"
              @click="onRandomPasswordClick"
            />
          </div>
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionPassword }}</div>
    </div>

    <div class="w-50">
      <BuProgress :model-value="strong" type="strong" :color="strongProgressColor" />
    </div>

    <div class="h-14 mt-4 flex justify-center items-center">
      <transition name="fade">
        <div v-if="isPasswordChanged" class="flex items-center gap-3">
          <button
            class="flex items-center justify-center w-11 h-11 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 hover:text-white rounded-xl border border-[#444] transition-all active:scale-95 shadow-lg"
            title="Przywróć stare hasło"
            @click="revertNewPassword"
          >
            <span class="text-xl">↩</span>
          </button>

          <button
            v-if="passwordMeetsRequirements"
            class="bg-rose-600 hover:bg-rose-500 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-rose-900/20 border border-rose-500/50 transition-all active:scale-95 flex items-center gap-2"
            @click="applyNewPassword"
          >
            <span class="text-lg">↻</span> Zastosuj i odśwież sesję
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
