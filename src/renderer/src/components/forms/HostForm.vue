<script lang="ts" setup>
import { ref } from 'vue'
import BuTimer from '../simpleComponents/BuTimer.vue'
import { customAlphabet } from 'nanoid/non-secure'
import zxcvbn from 'zxcvbn'

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LETTERS = 64

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
        .string({ message: 'Haslo jest wymagane' })
        .min(PASSWORD_MIN_LENGTH, {
          message: `Haslo musi miec minimum ${PASSWORD_MIN_LENGTH} znakow`
        })
        .refine((value) => (value.match(/\p{L}/gu) ?? []).length <= PASSWORD_MAX_LETTERS, {
          message: `Haslo moze zawierac maksymalnie ${PASSWORD_MAX_LETTERS} liter`
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

const strong = computed(() => zxcvbn(sessionPassword.value ?? '').score)

const refreshTime = 120
const show = ref(false)

const timer = ref<InstanceType<typeof BuTimer>>()
const time = ref(0)

onMounted(() => {
  onTimerFinish()
})

function onTimerTick(value: number): void {
  time.value = value
}

function onTimerFinish(): void {
  timer.value?.setTime(refreshTime)
  time.value = refreshTime
  sessionCode.value = nanoid()
}

function randomPassword(): void {
  sessionPassword.value = nanoidPassword()
}

function onTogglePasswordVisibility(): void {
  show.value = !show.value
  void validateField('sessionPassword')
}

function onRandomPasswordClick(): void {
  randomPassword()
  void validateField('sessionPassword')
}

function onPasswordBlur(): void {
  void validateField('sessionPassword')
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
            <UButton
              icon="lucide:dice-1"
              color="neutral"
              variant="link"
              class="text-white opacity-50"
              @click="onRandomPasswordClick"
            />
          </div>
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 mb-1 h-2">{{ errors.sessionPassword }}</div>
    </div>
    <div class="pt-4 pl-6 pr-6">
      <BuProgress
        v-model="strong"
        type="strong"
        :color="strong <= 1 ? 'error' : strong <= 3 ? 'warning' : 'success'"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
