/** Timeout for getDisplayMedia loopback — must not block session accept/capture. */
export const DISPLAY_MEDIA_LOOPBACK_TIMEOUT_MS = 10_000

/**
 * Requests display capture with system audio (loopback via Electron handler).
 * Rejects on timeout so capture/accept flows can continue without system audio.
 */
export async function getDisplayMediaLoopback(
  timeoutMs = DISPLAY_MEDIA_LOOPBACK_TIMEOUT_MS
): Promise<MediaStream> {
  const request = navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`getDisplayMedia loopback timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  })

  try {
    return await Promise.race([request, timeout])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
