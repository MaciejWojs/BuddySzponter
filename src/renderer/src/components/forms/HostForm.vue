<script lang="ts" setup>
import { ref } from 'vue'
import BuTimer from '../simpleComponents/BuTimer.vue'
import { customAlphabet } from 'nanoid/non-secure'
import zxcvbn from 'zxcvbn'

const { t } = useI18n()

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LETTERS = 64

const hasLowercase = (value: string): boolean => /\p{Ll}/u.test(value)
const hasUppercase = (value: string): boolean => /\p{Lu}/u.test(value)
const hasDigit = (value: string): boolean => /\p{N}/u.test(value)
const hasSpecialCharacter = (value: string): boolean => /[^\p{L}\p{N}]/u.test(value)

function hasRequiredPasswordCharacters(value: string): boolean {
  return hasLowercase(value) && hasUppercase(value) && hasDigit(value) && hasSpecialCharacter(value)
}

const nanoid = customAlphabet('1234567890abcdefghijklmnoprstuvxyzABCDEFGHIJKLMNOPRSTUVXYZ', 8)
const nanoidPassword = customAlphabet(
  '1234567890abcdefghijklmnoprstuvxyzABCDEFGHIJKLMNOPRSTUVXYZ#@!$%',
  12
)

const sessionCode = ref('')

const passwordValidator = computed(() =>
  toTypedSchema(
    z.object({
      sessionPassword: z
        .string({ message: t('validation.required') })
        .refine((value) => (value.match(/\p{L}/gu) ?? []).length <= PASSWORD_MAX_LETTERS, {
          message: t('validation.passwordMaxLetters', { count: PASSWORD_MAX_LETTERS })
        })
        .refine(hasLowercase, {
          message: t('validation.passwordRequiresLowercase')
        })
        .refine(hasUppercase, {
          message: t('validation.passwordRequiresUppercase')
        })
        .refine(hasDigit, {
          message: t('validation.passwordRequiresDigit')
        })
        .refine(hasSpecialCharacter, {
          message: t('validation.passwordRequiresSpecialCharacter')
        })
        .refine((value) => value.length >= PASSWORD_MIN_LENGTH, {
          message: t('validation.passwordMinLength', { count: PASSWORD_MIN_LENGTH })
        })
    })
  )
)

const { errors, defineField, validateField } = useForm({
  validationSchema: passwordValidator
})

const [sessionPassword, sessionPasswordAttrs] = defineField('sessionPassword', {
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

const refreshTime = 120
const [show, toggleShow] = useToggle(false)

const timer = ref<InstanceType<typeof BuTimer>>()
const time = ref(0)

onMounted(() => {
  onTimerFinish()
})

watchDebounced(
  sessionPassword,
  () => {
    void validateField('sessionPassword')
  },
  { debounce: 150 }
)

function onTimerTick(value: number): void {
  time.value = value
}

function onTimerFinish(): void {
  timer.value?.setTime(refreshTime)
  time.value = refreshTime
  sessionCode.value = nanoid()
}

function randomPassword(): void {
  let generatedPassword = nanoidPassword()

  while (!hasRequiredPasswordCharacters(generatedPassword)) {
    generatedPassword = nanoidPassword()
  }

  sessionPassword.value = generatedPassword
}
</script>

<template>
  <div>
    <div id="sessionCode" class="flex flex-col items-center">
      <h3>{{ $t('HostForm.sessionCode') }}</h3>
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
    <div id="progress" class="flex flex-col items-center pt-3 box-content h-fit pl-2 pr-2">
      <BuProgress type="progress" :model-value="time" :steps="120" />
    </div>
    <div id="timer" class="flex flex-row gap-4 justify-center items-center">
      <h3>{{ $t('HostForm.timeToJoin') }}</h3>
      <BuTimer ref="timer" size="1.4rem" class="" @finish="onTimerFinish" @tick="onTimerTick" />
    </div>
    <div id="sessionPassword" class="flex flex-col items-center">
      <h3>{{ $t('HostForm.sessionPassword') }}</h3>
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
        @blur="() => validateField('sessionPassword')"
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
              @click="toggleShow()"
            />
            <UButton
              icon="lucide:dice-1"
              color="neutral"
              variant="link"
              class="text-white opacity-50"
              @click="randomPassword"
            />
          </div>
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 min-h-2">{{ errors.sessionPassword }}</div>
    </div>
    <div class="pt-4 pl-6 pr-6">
      <BuProgress :model-value="strong" type="strong" :color="strongProgressColor" />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
