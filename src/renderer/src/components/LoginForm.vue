<template>
  <form @submit.prevent="handleLogin" class="login-form flex flex-col gap-4 items-center">
    <BuInput
      v-model="email"
      type="email"
      :placeholder="$t('login.email')"
      icon=""
      :error="!!errors.email"
    />
    <div v-if="errors.email" class="error-message text-red-500 text-sm">
      {{ errors.email }}
    </div>
    <BuInput
      v-model="password"
      type="password"
      :placeholder="$t('login.password')"
      icon=""
      :error="!!errors.password"
    />
    <div v-if="errors.password" class="error-message text-red-500 text-sm">
      {{ errors.password }}
    </div>
    <button type="submit" :disabled="isLoading" class="login-button">
      {{ t('login.button') }}
    </button>
    <button type="button" @click="toggleLocale" class="lang-button">
      {{ locale === 'pl-PL' ? 'EN' : 'PL' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function toggleLocale() {
  locale.value = locale.value === 'pl-PL' ? 'en-US' : 'pl-PL'
}

const loginSchema = toTypedSchema(
  z.object({
    email: z.string()
      .min(1, 'E-mail jest wymagany')
      .email('Podaj prawidłowy adres e-mail')
      .max(100, 'E-mail jest za długi'),

    password: z.string()
      .min(1, 'Hasło jest wymagane')
      .min(8, 'Hasło musi mieć co najmniej 8 znaków')
      .max(50, 'Hasło jest za długie')
      .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
      .regex(/[0-9]/, 'Hasło musi zawierać cyfrę')
      .regex(/[^a-zA-Z0-9]/, 'Hasło musi zawierać znak specjalny'),
  })
)

const { errors, defineField, handleSubmit } = useForm({ validationSchema: loginSchema })

const [email] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })

const isLoading = ref(false)

const handleLogin = handleSubmit((values) => {
  console.log('Zalogowano:', values)
})
</script>