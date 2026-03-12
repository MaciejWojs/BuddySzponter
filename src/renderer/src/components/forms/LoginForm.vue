<template>
  <div class="flex flex-col items-center gap-6">
    <div class="flex flex-col justify-items-center items-center gap-2">
      <BuInput v-model="email" :placeholder="$t('login.email')" :error="!!errors.email">
        <template #prefix>
          <Mail class="w-6 h-6 opacity-50" />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.email }}</div>
    </div>

    <div class="flex flex-col justify-items-center items-center gap-2">
      <BuInput
        v-model="password"
        :placeholder="$t('login.password')"
        :type="show ? 'text' : 'password'"
        :error="!!errors.password"
      >
        <template #suffix>
          <UButton
            color="neutral"
            variant="link"
            class="text-white opacity-50"
            :icon="!show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="show ? 'Hide password' : 'Show password'"
            :aria-pressed="show"
            @click="show = !show"
          />
        </template>
      </BuInput>
      <div class="text-red-500 text-sm mt-1 h-2">{{ errors.password }}</div>
    </div>

    <GrayButton @click="handleLogin">
      {{ t('login.button') }}
      <template #suffix>
        <UIcon v-if="!isLoading" name="i-lucide-arrow-right" class="w-6 h-6 opacity-75" />
        <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="animate-spin w-6 h-6" />
      </template>
    </GrayButton>
    <NavBar v-model="activeNav" :items="navItems" />
    <div>
      <div class="text-red-500 text-sm mt-1 h-2">{{ genericError }}</div>
    </div>
  </div>
  <SharingNavBar />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NavBarItem } from '@renderer/components/UI/NavBar.vue'
import SettingsButton from '@renderer/components/simpleComponents/SettingsButton.vue'
import HomeButton from '@renderer/components/simpleComponents/HomeButton.vue'
import DeviceButton from '@renderer/components/simpleComponents/DeviceButton.vue'

const { t } = useI18n()

// Custom svg components
import Mail from '@images/components/mail.svg?component'
import { useAppToast } from '@renderer/composables/useAppToast'

const { custom: toastCustom } = useAppToast()

// NavBar
const activeNav = ref('home')
const navItems: NavBarItem[] = [
  { name: 'settings', component: SettingsButton, size: 52 },
  { name: 'home', component: HomeButton, size: 68 },
  { name: 'device', component: DeviceButton, size: 52 }
]

// State
const show = ref(false)
const isLoading = ref(false)

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

const { errors, defineField, handleSubmit } = useForm({
  validationSchema: loginValidator
})

const [email] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })

// Generic error state for login failures (e.g., incorrect credentials)
const genericError = ref<string | null>(null)

const handleLogin = handleSubmit((values) => {
  console.log('Login values:', values)

  try {
    isLoading.value = true
    setTimeout(() => {
      toastCustom('Sukces, udało ci się zalogować', '')
      genericError.value = null
      isLoading.value = false
    }, 2000)
  } catch (apiError: unknown) {
    console.error('Login error:', apiError)
    genericError.value = 'Coś poszło nie tak po stronie serwera. Spróbuj później.'
    isLoading.value = false
  }

  // 2. Obsługa błędów autoryzacji (np. 401 Unauthorized)
  //     else if (apiError.response?.status === 401) {
  //       setErrors({
  //         email: ' ', // Puste znaki, żeby podświetlić pole na czerwono
  //         password: 'Niepoprawny e-mail lub hasło'
  //       })
  //     }
})
</script>
