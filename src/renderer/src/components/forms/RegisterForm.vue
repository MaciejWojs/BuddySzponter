<template>
  <div class="flex flex-col items-center gap-6">
    <div class="flex flex-col justify-items-center items-center gap-2">
      <BuInput v-model="email" :placeholder="$t('register.email')" :error="!!errors.email">
        <template #prefix>
          <Mail class="w-6 h-6 opacity-50" />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.email }}</div>
    </div>

    <div class="flex flex-col justify-items-center items-center gap-2">
      <BuInput
        v-model="password"
        :placeholder="$t('register.password')"
        :type="showPassword ? 'text' : 'password'"
        :error="!!errors.password"
      >
        <template #suffix>
          <UButton
            color="neutral"
            variant="link"
            class="text-white opacity-50"
            :icon="!showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.password }}</div>
    </div>

    <div class="flex flex-col justify-items-center items-center gap-2">
      <BuInput
        v-model="confirmPassword"
        :placeholder="$t('register.confirmPassword')"
        :type="showConfirmPassword ? 'text' : 'password'"
        :error="!!errors.confirmPassword"
      >
        <template #suffix>
          <UButton
            color="neutral"
            variant="link"
            class="text-white opacity-50"
            :icon="!showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showConfirmPassword"
            @click="showConfirmPassword = !showConfirmPassword"
          />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.confirmPassword }}</div>
    </div>

    <GrayButton @click="handleRegister">
      {{ t('register.button') }}
      <template #suffix>
        <UIcon v-if="!isLoading" name="i-lucide-arrow-right" class="w-6 h-6 opacity-75" />
        <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="animate-spin w-6 h-6" />
      </template>
    </GrayButton>

    <div>
      <div class="text-red-500 text-sm mt-1 h-2">{{ genericError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const { t } = useI18n()

// Custom svg components
import Mail from '@images/components/mail.svg?component'
import { useAppToast } from '@renderer/composables/useAppToast'

const { custom: toastCustom } = useAppToast()

// State
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)

// validator
const registerValidator = computed(() =>
  toTypedSchema(
    z
      .object({
        email: z
          .string({ message: t('validation.required') })
          .email({ message: t('validation.invalidEmail') }),
        password: z
          .string({ message: t('validation.required') })
          .min(6, { message: t('validation.passwordTooShort') }),
        confirmPassword: z.string({ message: t('validation.required') })
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: t('validation.passwordsMismatch'),
        path: ['confirmPassword']
      })
  )
)

const { errors, defineField, handleSubmit } = useForm({
  validationSchema: registerValidator
})

const [email] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })
const [confirmPassword] = defineField('confirmPassword', { validateOnModelUpdate: false })

// Generic error state for register failures
const genericError = ref<string | null>(null)

const handleRegister = handleSubmit((values) => {
  console.log('Register values:', values)

  try {
    isLoading.value = true
    setTimeout(() => {
      toastCustom('Sukces, konto zostało utworzone', '')
      genericError.value = null
      isLoading.value = false
    }, 2000)
  } catch (apiError: unknown) {
    console.error('Register error:', apiError)
    genericError.value = 'Coś poszło nie tak po stronie serwera. Spróbuj później.'
    isLoading.value = false
  }
})
</script>
