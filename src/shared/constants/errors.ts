// shared/constants/errors.ts
export const APP_ERRORS = {
  AUTH: {
    TOKEN_MISSING: { success: false as const, message: 'Access Token missing' },
    UNAUTHORIZED: { success: false as const, message: 'Unauthorized access' },
    REFRESH_FAILED: { success: false as const, message: 'Session expired. Please log in again.' }
  },
  USER: {
    NOT_FOUND: { success: false as const, message: 'User not found' },
    INVALID_DATA: { success: false as const, message: 'Invalid user data received from server' },
    UPLOAD_CANCELED: { success: false as const, message: 'File selection canceled' }
  },
  SYSTEM: {
    UNKNOWN: { success: false as const, message: 'Unknown system error occurred' },
    NETWORK: { success: false as const, message: 'Network connection failed' },
    UPDATE_REQUIRED: {
      success: false as const,
      message: 'Ta wersja aplikacji nie jest wspierana. Zaktualizuj aplikacje, aby kontynuowac.'
    }
  },
  CONNECTION: {
    FAILED: { success: false as const, message: 'Failed to establish connection' },
    INVALID_RESPONSE: { success: false as const, message: 'Invalid response from server' },
    INCORRECT_PASSWORD: { success: false as const, message: 'Incorrect password' },
    INCORRECT_CODE: { success: false as const, message: 'Invalid connection code' }
  }
} as const
