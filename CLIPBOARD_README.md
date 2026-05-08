# Testowanie transferu Schowka (Clipboard P2P)

Transfer schowka wykorzystuje kanał WebRTC DataChannel (reliable, ordered).

## Funkcje UI

1. **Push Clipboard** (ikona `clipboard-copy` na UI w trakcie sesji) - wysyła lokalną zawartość schowka do zdalnego peera. Odbiorca automatycznie nadpisuje swój własny schowek otrzymanym tekstem.
2. **Pull Clipboard** (ikona `clipboard-paste`) - wysyła prośbę do zdalnego peera o podzielenie się jego schowkiem. Otrzymana zawartość zostaje umieszczona w schowku na Twoim komputerze.

## Testowanie (Test manualny)

1. **Test Push (Wysyłanie):**
   - Skopiuj testowy tekst do schowka (np. zawierający polskie znaki "Zażółć gęślą jaźń" lub emoji "🚀🎉").
   - W aktywnym połączeniu (widget nawigacyjny na dachu aplikacji), kliknij ikonę **Push Clipboard**.
   - Na urządzeniu "peer" spróbuj wkleić skopiowany tekst (np. `Ctrl+V` notatnik). Schowek peera powinien zawierać Twój tekst.

2. **Test Pull (Pobieranie):**
   - Na urządzeniu "peer" skopiuj unikalny tekst, którego nie miałeś przedtem (np. "Peers unique clipboard text xyz").
   - Na Twoim urządzeniu w panelu kliknij **Pull Clipboard**.
   - Spróbuj wkleić test do lokalnego notatnika. Twój schowek powinien być zaktualizowany o informację z urządzenia obok.

3. **Edge cases:** Pusty tekst, ogromny tekst podchodzący w MB wielkości (zacznie być zwracany błąd limitów).
   - Notatka: Jeżeli transfer się opóźnia, po 10 sekundach wysłany alert poleci do konsoli (błąd transferu timeout).

## Jak wdrożyć/rozszerzyć "Chunking" dla ciężkich payloadów > 1MB

Teraz system ma cap limit ustawiony na wielkość ~1MB upewniając się, że channel nie spędza zbyt wiele czasu/bufferów za jednym wysłaniem.

**Gdzie dokonać rozszerzenia:**

1. W pliku `src/renderer/src/composables/channels/useClipboardChannel.ts`.
2. Poszukaj miejsca walidacji `if (new Blob([text]).size > 1024 * 1024) { throw new Error(...) }`

**Jak zaimplementować (pseudokod w wyżej wskazanym pliku):**

```ts
// 1. Zmiana struktury w p2pProtocol.ts
type: 'clipboard-push-chunk',
payload: { id: uuid, chunk: string, index: number, eof: boolean }

// 2. Wysłanie tekstu fragmentowo w użyciu useClipboardChannel.ts:
const CHUNK_SIZE = 16 * 1024; // 16 KB chunks
for(let i = 0; i < text.length; i += CHUNK_SIZE) {
   let slice = text.slice(i, i + CHUNK_SIZE);
   webRtcService.sendData('clipboard', JSON.stringify({
     type: 'clipboard-push-chunk',
     payload: { id, index: i, chunk: slice, eof: i+CHUNK_SIZE >= text.length }
   }));
}

// 3. Odbiorca w store odbiera te chunki, dodaje je do bufora według ID oraz gdy otrzyma EOF = true
// dokonuje zapisu ipcRenderer.invoke('clipboard:writeText', buffer[id].join(''))
```
