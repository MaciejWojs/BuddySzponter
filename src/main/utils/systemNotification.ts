// main/utils/systemNotification.ts

import { Notification } from 'electron'

interface AccessNotificationCallbacks {
  onAccept: () => void
  onReject: () => void
}

export function showAccessRequestNotification(callbacks: AccessNotificationCallbacks): void {
  // Sprawdzamy wsparcie na poziomie utilsa
  if (!Notification.isSupported()) {
    console.warn('[SystemNotification] Powiadomienia systemowe nie są wspierane na tym OS.')
    return
  }

  const notification = new Notification({
    title: 'Nowa prośba o dostęp',
    body: 'Ktoś próbuje podłączyć się do Twojego ekranu.',
    actions: [
      { type: 'button', text: 'Akceptuj' },
      { type: 'button', text: 'Odrzuć' }
    ],
    closeButtonText: 'Zamknij'
  })

  // Nasłuchujemy na akcje i wywołujemy przekazane funkcje
  notification.on('action', (_event, index) => {
    if (index === 0) {
      callbacks.onAccept()
    } else if (index === 1) {
      callbacks.onReject()
    }
  })

  notification.on('close', () => {
    console.log('[SystemNotification] Powiadomienie systemowe zostało zamknięte/zignorowane')
  })

  // Wyświetlamy powiadomienie
  notification.show()
}
