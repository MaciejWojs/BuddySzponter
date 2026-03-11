// src/main/apiRoutes.ts

export const API_ROUTES = {
  AUTH: {
    // POST: Rejestracja nowego użytkownika
    REGISTER: '/auth/register',

    // POST: Logowanie użytkownika
    LOGIN: '/auth/login',

    // POST: Odświeżanie tokena autoryzacyjnego
    REFRESH: '/auth/refresh',

    // POST: Wylogowanie użytkownika
    LOGOUT: '/auth/logout',

    // GET: Pobranie informacji o zalogowanym użytkowniku
    ME: '/auth/me'
  }
} as const
