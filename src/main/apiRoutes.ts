// src/main/apiRoutes.ts

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
  }
} as const
