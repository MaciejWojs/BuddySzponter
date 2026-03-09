<script lang="ts" setup>
import { ref } from 'vue'
import BuTimer from '../simpleComponents/BuTimer.vue'
import { customAlphabet } from 'nanoid/non-secure'
import zxcvbn from 'zxcvbn'

const nanoid = customAlphabet('1234567890abcdefghijklmnoprstuvxyzABCDEFGHIJKLMNOPRSTUVXYZ', 8)
const nanoidPassword = customAlphabet(
  '1234567890abcdefghijklmnoprstuvxyzABCDEFGHIJKLMNOPRSTUVXYZ#@!$%',
  12
)

const sessionCode = ref('')
const sessionPassword = ref('')
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
        :type="show ? 'text' : 'password'"
        text-align="left"
        font-family="mono"
        font-size="20px"
        :copy-on-click="true"
        :show-copy-popover="true"
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
              @click="show = !show"
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
    </div>
    <div class="pt-4 pl-6 pr-6">
      <UProgress
        v-model="strong"
        :max="4"
        :color="strong <= 1 ? 'error' : strong <= 3 ? 'warning' : 'success'"
        class="w-full"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
