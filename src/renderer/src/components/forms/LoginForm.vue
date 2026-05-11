<template>
  <!-- Sekcja widoku komponentu LoginForm: definiuje strukturę renderowaną w interfejsie użytkownika. -->
  <div class="flex flex-col items-center gap-5">
    <div class="flex flex-col justify-items-center items-center gap-2">
      <p class="w-full max-w-sm text-left text-white text-base font-medium opacity-90">
        {{ t('login.email') }}
      </p>
      <BuInput v-model="email" :placeholder="$t('login.email')" :error="!!errors.email">
        <template #prefix>
          <Mail class="w-6 h-6 opacity-50" />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.email }}</div>
    </div>

    <div class="flex flex-col justify-items-center items-center gap-2">
      <p class="w-full max-w-sm text-left text-white text-base font-medium opacity-90">
        {{ t('login.password') }}
      </p>
      <BuInput
        v-model="password"
        placeholder="**********"
        :type="show ? 'text' : 'password'"
        :error="!!errors.password"
      >
        <template #suffix>
          <UButton
            color="neutral"
            variant="link"
            class="text-white opacity-50"
            :icon="!show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="show ? t('common.hidePassword') : t('common.showPassword')"
            :aria-pressed="show"
            @click="show = !show"
          />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.password }}</div>
    </div>

    <div class="w-full max-w-sm space-y-1 text-center">
      <button
        type="button"
        class="text-white text-sm opacity-80 hover:opacity-100 hover:underline underline-offset-2 transition-opacity mx-auto"
      >
        {{ t('login.forgotPassword') }}
      </button>
      <div class="flex items-center justify-center gap-1 text-sm text-white opacity-80">
        <span>{{ t('login.noAccount') }}</span>
        <button
          type="button"
          class="text-white text-sm opacity-80 hover:opacity-100 hover:underline underline-offset-2 transition-opacity"
          @click="goToRegister"
        >
          {{ t('login.registerNow') }}
        </button>
      </div>
    </div>

    <GrayButton @click="handleLogin">
      {{ t('login.button') }}
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
// Sekcja logiki komponentu LoginForm: zarządza danymi, zdarzeniami i zachowaniem widoku.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
const { t } = useI18n()

// Custom svg components
import Mail from '@images/components/mail.svg?component'
import { useAppToast } from '@renderer/composables/useAppToast'
import { useUserStore } from '@renderer/stores/userStore'

const { success: toastSuccess } = useAppToast()
const router = useRouter()
const userStore = useUserStore()
const { isLoggingIn, errorMessage, fieldErrors } = storeToRefs(userStore)

// State
const show = ref(false)

// validator
const loginValidator = computed(() =>
  toTypedSchema(
    z.object({
      email: z
        .string({ message: t('validation.required') })
        .email({ message: t('validation.invalidEmail') }),
      password: z
        .string({ message: t('validation.required') })
        .min(6, { message: t('validation.passwordTooShort') })
    })
  )
)

const { errors, defineField, handleSubmit, setErrors } = useForm({
  validationSchema: loginValidator
})

const [email] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })

const genericError = computed(() => errorMessage.value)
const isLoading = computed(() => isLoggingIn.value)

const handleLogin = handleSubmit(async (values) => {
  const success = await userStore.login({
    email: values.email,
    password: values.password
  })

  if (!success) {
    setErrors({
      email: fieldErrors.value.email,
      password: fieldErrors.value.password
    })
    return
  }

  toastSuccess('toast.loginSuccess')
  await router.replace('/')
})

function goToRegister(): void {
  router.push('/register')
}
</script>
