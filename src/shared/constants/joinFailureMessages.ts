/**
 * Stałe komunikatów błędów ścieżki JOIN (main + renderer), żeby mapować je na i18n w UI.
 * Używaj tych samych literałów w handlerach — nie duplikuj w innych plikach.
 */
export const JOIN_HANDLER_CATCH_MESSAGE =
  'An error occurred while trying to join the connection. Please try again.' as const

export const JOIN_WS_AFTER_JOIN_MESSAGE = 'Błąd połączenia WebSocket po dołączeniu.' as const

export const JOIN_RENDERER_NETWORK_MESSAGE = 'network error' as const

/** Odpowiedź API (np. 422) — ten sam literał co w Swagger / backendzie. */
export const JOIN_API_INCORRECT_PASSWORD = 'Incorrect password' as const
