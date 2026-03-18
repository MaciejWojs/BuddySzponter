export const API_ROUTES = {
  AUTH: {
    // POST: Register a new user
    REGISTER: '/auth/register',

    // POST: User login
    LOGIN: '/auth/login',

    // POST: Refresh authorization token
    REFRESH: '/auth/refresh',

    // POST: User logout
    LOGOUT: '/auth/logout',

    // GET: Get information about the logged-in user
    ME: '/auth/me'
  },
  CRYPTO: {
    // POST: Handshake to establish secure session
    HANDSHAKE: '/crypto/handshake'
  },
  CONNECTION: {
    CONNECTIONS: '/connections',
    JOIN: '/connections/join'
  },
  CORE: {
    SUPPORTED_VERSIONS: '/core/supported-versions',
    LOCALE: '/core/locale'
  }
} as const
