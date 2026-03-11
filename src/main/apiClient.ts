import axios from 'axios'
import { authManager } from './authManager'
import { API_ROUTES } from './apiRoutes'
// Importujemy Twoją istniejącą funkcję i typ
import { decryptPayload, type EncryptedPayload } from '../main/decrypt-payload'

export const apiClient = axios.create({
  baseURL: 'http://localhost/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

console.log('API CLIENT INICJOWANY!')

// === INTERCEPTOR RESPONSU ===
apiClient.interceptors.response.use(
  (response) => {
    // 1. SPRAWDZANIE I DESZYFROWANIE
    console.log('[API] Odpowiedź body:', response.data)
    if (
      response.data &&
      typeof response.data === 'object' &&
      'payload' in response.data &&
      response.data.payload?.iv &&
      response.data.payload?.tag &&
      response.data.payload?.data
    ) {
      try {
        console.log('[API] Wykryto zaszyfrowany pakiet AES-GCM, deszyfrowanie...')
        const decryptedData = decryptPayload(response.data as EncryptedPayload)
        response.data = decryptedData
        console.log('[API] Deszyfrowanie zakończone, odszyfrowane dane:', decryptedData)
      } catch (error) {
        console.error('[API DECRYPTION ERROR]', error)
        return Promise.reject(new Error('Failed to decrypt secure response'))
      }
    }

    // 2. LOGIKA TOKENÓW (BEZ ZMIAN)
    const url = response.config.url || ''
    if (url.includes(API_ROUTES.AUTH.LOGIN) || url.includes(API_ROUTES.AUTH.REFRESH)) {
      const { accessToken, refreshToken } = response.data

      if (accessToken) authManager.setAccessToken(accessToken)
      if (refreshToken) authManager.setRefreshToken(refreshToken)

      delete response.data.accessToken
      delete response.data.refreshToken
    }

    return response
  },
  async (error) => {
    // ... istniejąca logika odświeżania tokena
    return Promise.reject(error)
  }
)
