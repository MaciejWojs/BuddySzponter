// src/main/apiClient.ts
import axios from 'axios'
import { authManager } from './authManager'
import { API_ROUTES } from './apiRoutes'

export const apiClient = axios.create({
  baseURL: 'http://localhost/api/v1', // Zmień na swój port Hono!
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// === INTERCEPTOR REQUESTU (Przed wysłaniem) ===
apiClient.interceptors.request.use((config) => {
  // AUTH wyłączone tymczasowo
  // const token = authManager.getAccessToken()
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`
  // }
  // Logowanie requestu
  console.log('[API REQUEST]', {
    method: config.method,
    url: config.url,
    data: config.data,
    params: config.params,
    headers: config.headers
  })
  return config
})

// === INTERCEPTOR RESPONSU (Po odebraniu odpowiedzi) ===
apiClient.interceptors.response.use(
  (response) => {
    const url = response.config.url || ''

    // MAGIA: Zatrzymujemy tokeny w Main Process po logowaniu!
    if (url.includes(API_ROUTES.AUTH.LOGIN) || url.includes(API_ROUTES.AUTH.REFRESH)) {
      const { accessToken, refreshToken } = response.data

      if (accessToken) authManager.setAccessToken(accessToken)
      if (refreshToken) authManager.setRefreshToken(refreshToken)

      // Kasujemy je z payloadu, żeby nie poleciały przez IPC do Vue
      delete response.data.accessToken
      delete response.data.refreshToken
    }
    return response
  },

  async (error) => {
    const originalRequest = error.config

    // CICHE ODŚWIEŻANIE: Backend rzucił 401, a my nie próbowaliśmy jeszcze odświeżyć
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true // Zabezpieczenie przed pętlą

      const refreshToken = authManager.getRefreshToken()

      if (refreshToken) {
        try {
          // Prosimy Hono o nowy zestaw używając naszego endpointu z apiRoutes
          await apiClient.post(API_ROUTES.AUTH.REFRESH, { refreshToken })

          // Mamy nowy token! Powtarzamy przerwane zapytanie
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh Token też wygasł - robimy twarde wylogowanie
          authManager.clearTokens()
          return Promise.reject(refreshError)
        }
      }
    }

    // Jeśli to inny błąd (np. 400 Bad Request, 404 Not Found) - po prostu go rzucamy dalej
    return Promise.reject(error)
  }
)
