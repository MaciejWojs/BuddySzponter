import { APP_ERRORS } from '@shared/constants/errors'
import {
  JOIN_API_INCORRECT_PASSWORD,
  JOIN_HANDLER_CATCH_MESSAGE,
  JOIN_RENDERER_NETWORK_MESSAGE,
  JOIN_WS_AFTER_JOIN_MESSAGE
} from '@shared/constants/joinFailureMessages'

type TranslateFn = (key: string, values?: Record<string, unknown>) => string

/**
 * Mapuje surowy `message` z IPC (join / WebSocket / renderer) na tekst dla toastu gościa.
 */
export function translatedGuestJoinFailureMessage(
  message: string | undefined | null,
  t: TranslateFn
): string {
  const m = (message ?? '').trim()

  if (m === APP_ERRORS.CONNECTION.INVALID_RESPONSE.message) {
    return t('guestForm.joinErrorInvalidResponse')
  }
  if (m === JOIN_HANDLER_CATCH_MESSAGE) {
    return t('guestForm.joinErrorHandlerCatch')
  }
  if (m === JOIN_WS_AFTER_JOIN_MESSAGE) {
    return t('guestForm.joinErrorWsAfterJoin')
  }
  if (m === JOIN_API_INCORRECT_PASSWORD) {
    return t('guestForm.joinErrorIncorrectPassword')
  }
  if (m === APP_ERRORS.CONNECTION.INCORRECT_CODE.message) {
    return t('guestForm.joinErrorIncorrectSessionCode')
  }
  if (m === APP_ERRORS.CONNECTION.FAILED.message) {
    return t('guestForm.joinErrorFailedConnection')
  }
  if (m.toLowerCase() === JOIN_RENDERER_NETWORK_MESSAGE.toLowerCase()) {
    return t('guestForm.joinErrorNetwork')
  }

  if (m) {
    return t('guestForm.joinErrorUnknownWithDetail', { detail: m })
  }

  return t('guestForm.joinErrorGeneric')
}
