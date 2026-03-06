<template>
  <form @submit.prevent="handleLogin" class="login-form flex flex-col gap-4 items-center">
    <BuInput
      v-model="email"
      type="email"
      :placeholder="$t('login.email')"
      :error="!!errors.email"
    />
    <div v-if="errors.email" class="error-message text-red-500 text-sm">
      {{ errors.email }}
    </div>
    <BuInput
      v-model="password"
      type="password"
      :placeholder="$t('login.password')"
      :error="!!errors.password"
    >
      <template #icon>
        <MailIcon class="w-5 h-5 text-white "/>
      </template>
    </BuInput>
    <div v-if="errors.password" class="error-message text-red-500 text-sm">
      {{ errors.password }}
    </div>

        <div class="flex items-center gap-2 flex-col w-48">
          {{ t('login.passwordStrength') }}
          <UProgress v-model="strong" :max="4" :color="strong <= 1 ? 'error' : strong <= 3 ? 'warning' : 'success'" class="w-full" />
        </div>

    <button type="submit" :disabled="isLoading" class="login-button">
      {{ t('login.button') }}
    </button>


    <HomeButton />

    <button type="button" @click="toggleLocale" class="lang-button">
      {{ locale === 'pl-PL' ? 'EN' : 'PL' }}
    </button>


  </form>
</template>

<script setup lang="ts">
import MailIcon from '@renderer/assets/images/components/mail.svg?component'
import zxcvbn from 'zxcvbn'
import SortButton from './simpleComponents/SortButton.vue'
import HomeButton from './simpleComponents/HomeButton.vue'

const strong = computed(() => zxcvbn(password.value ?? '').score)

const { t, locale } = useI18n()

function toggleLocale() {
  locale.value = locale.value === 'pl-PL' ? 'en-US' : 'pl-PL'
}

const loginSchema = computed(() => toTypedSchema(
  z.object({
    email: z.string()
      .default('')
      .pipe(z.string().min(1, t('login.emailError.required')).email(t('login.emailError.invalid')).max(100, t('login.emailError.maxLength'))),

    password: z.string()
      .default('')
      .pipe(z.string().nonempty(t('login.passwordError.required')).refine((val) => zxcvbn(val).score >= 2, {
        message: t('login.passwordError.weak'),
      }))
  })
))

const { errors, defineField, handleSubmit, validateField } = useForm({ validationSchema: loginSchema })

const [email] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })

const debouncedValidateEmail = useDebounceFn(() => validateField('email'), 300)
const debouncedValidatePassword = useDebounceFn(() => validateField('password'), 300)

watch(email, debouncedValidateEmail)
watch(password, debouncedValidatePassword)

const isLoading = ref(false)

const handleLogin = handleSubmit((values) => {
  console.log('Zalogowano:', values)
})
</script>