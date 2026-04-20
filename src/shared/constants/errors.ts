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
    NETWORK: { success: false as const, message: 'Network connection failed' }
  },
  CONNECTION: {
    FAILED: { success: false as const, message: 'Failed to establish connection' },
    INVALID_RESPONSE: { success: false as const, message: 'Invalid response from server' }
  }
} as const
