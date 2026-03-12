import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse
} from '../main/schemas/authSchemas'

export interface ApiResponse<T = unknown> {
  success: boolean
  status: number
  data?: T
  error?: unknown
}

declare global {
  interface Window {
    api: {
      auth: {
        register: (data: RegisterInput) => Promise<ApiResponse<RegisterResponse>>
        login: (credentials: LoginInput) => Promise<ApiResponse<LoginResponse>>
        logout: () => Promise<ApiResponse<void>>
        getMe: () => Promise<ApiResponse<unknown>>
      }
    }
  }
}
