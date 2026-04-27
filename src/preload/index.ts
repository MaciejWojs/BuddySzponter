import { contextBridge, ipcRenderer, sharedTexture } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AppLanguage, Translation } from '../shared/schemas/langSchemas'
import {
  CreateConnectionResponse,
  GetAvailableLanguagesResponse,
  GetCurrentUserResponse,
  GetLocaleResponse,
  GetSupportedVersionsResponse,
  JoinConnectionResponse,
  UploadAvatarResponse,
  WsActionResponse,
  WsCategory,
  WsConnectResponse
} from '../shared/schemas/ipc'
import type { WsConnectionListeners } from '../shared/schemas/ipc'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'
import {
  WsRequestAccess,
  WsConnectionAccepted,
  WsConnectionRejected,
  WsConnectionError,
  WsAcknowledged,
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady
} from '../shared/schemas/ws'
import { LoginInput, RegisterInput } from '../shared/schemas/user'

const recorder = {
  saveFile: (buffer: ArrayBuffer) => ipcRenderer.invoke('save-file', buffer)
}

// Custom APIs for renderer
const api = {
  auth: {
    register: (data: RegisterInput) => ipcRenderer.invoke('auth:register', data),
    login: (credentials: LoginInput) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getMe: () => ipcRenderer.invoke('auth:me'),
    refresh: () => ipcRenderer.invoke('auth:refresh')
  },
  settings: {
    getLanguage: (): Promise<AppLanguage> => ipcRenderer.invoke('settings:getLanguage'),
    setLanguage: (lang: AppLanguage): Promise<boolean> =>
      ipcRenderer.invoke('settings:setLanguage', lang),
    getTranslation: (): Promise<Translation> => ipcRenderer.invoke('settings:getTranslation'),
    getHardwareId: (): Promise<string> => ipcRenderer.invoke('settings:getHardwareId')
  },
  core: {
    getLocale: (lang: AppLanguage): Promise<GetLocaleResponse> =>
      ipcRenderer.invoke('core:getLocale', lang),
    getAvailableLanguages: (): Promise<GetAvailableLanguagesResponse> =>
      ipcRenderer.invoke('core:getAvailableLanguages'),
    getSupportedVersions: (): Promise<GetSupportedVersionsResponse> =>
      ipcRenderer.invoke('core:getSupportedVersions'),
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('core:getAppVersion'),
    getVersionStatus: (): Promise<
      'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'
    > => ipcRenderer.invoke('core:getVersionStatus'),
    isUpdateRequired: (): Promise<boolean> => ipcRenderer.invoke('core:isUpdateRequired')
  },
  users: {
    uploadAvatar: (userId: string | null): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatar', userId),

    uploadAvatarByBuffer: (
      buffer: ArrayBuffer,
      fileName: string,
      mimeType: string
    ): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatarByBuffer', buffer, fileName, mimeType),

    getCurrentUser: (): Promise<GetCurrentUserResponse> => ipcRenderer.invoke('user:getCurrentUser')
  },
  connection: {
    create: (data: CreateConnectionRequestSchema): Promise<CreateConnectionResponse> =>
      ipcRenderer.invoke('connection:create', data),
    join: (data: JoinConnectionRequestSchema): Promise<JoinConnectionResponse> =>
      ipcRenderer.invoke('connection:join', data)
  },
  ws: {
    connect: (token: string): Promise<WsConnectResponse> =>
      ipcRenderer.invoke('ws:connect', { connectionToken: token }),

    disconnect: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:disconnect'),

    respondAccept: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:respond-accept'),
    respondReject: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:respond-reject'),

    requestAccess: (sessionId: string): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:request-access', { sessionId }),

    hostAcknowledge: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:acknowledged'),
    guestAcknowledge: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:acknowledge'),

    webrtcOffer: (data: WsWebRTCOffer): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-offer', data),
    webrtcAnswer: (data: WsWebRTCAnswer): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-answer', data),
    webrtcIceCandidate: (data: WsWebRTCIceCandidate): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ice-candidate', data),
    webrtcReady: (data: WsWebRTCReady): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ready', data),

    connection: (callbacks: WsConnectionListeners) => {
      ipcRenderer.on('ws:connection', (_, { type, data }) => {
        if (type === 'connected') callbacks.onConnected(data)
        if (type === 'disconnected') callbacks.onDisconnected(data)
        if (type === 'manual-disconnected') callbacks.onManualDisconnected(data)
        if (type === 'connect_error') callbacks.onConnectError(data)
      })
    },

    access: (callbacks: {
      onRequest: (d: WsRequestAccess) => void
      onAccepted: (d: WsConnectionAccepted) => void
      onRejected: (d: WsConnectionRejected) => void
      onError: (d: WsConnectionError) => void
    }) => {
      ipcRenderer.on('ws:access', (_, { type, data }) => {
        if (type === 'request-access') callbacks.onRequest(data)
        if (type === 'accepted') callbacks.onAccepted(data)
        if (type === 'rejected') callbacks.onRejected(data)
        if (type === 'server-error') callbacks.onError(data)
      })
    },

    handshake: (callbacks: { onAcknowledged: (d: WsAcknowledged) => void }) => {
      ipcRenderer.on('ws:handshake', (_, { type, data }) => {
        if (type === 'acknowledged') callbacks.onAcknowledged(data)
      })
    },

    webrtc: (callbacks: {
      onOffer: (d: WsWebRTCOffer) => void
      onAnswer: (d: WsWebRTCAnswer) => void
      onIceCandidate: (d: WsWebRTCIceCandidate) => void
      onReady: (d: WsWebRTCReady) => void
    }) => {
      ipcRenderer.on('ws:webrtc', (_, { type, data }) => {
        if (type === 'offer') callbacks.onOffer(data)
        if (type === 'answer') callbacks.onAnswer(data)
        if (type === 'ice-candidate') callbacks.onIceCandidate(data)
        if (type === 'ready') callbacks.onReady(data)
      })
    },

    removeAllListeners: () => {
      const categories: WsCategory[] = ['ws:connection', 'ws:access', 'ws:handshake', 'ws:webrtc']
      categories.forEach((ch) => ipcRenderer.removeAllListeners(ch))
    }
  },
  app: {
    showApp: (): Promise<void> => ipcRenderer.invoke('show-main-window'),
    hideToTray: (): Promise<void> => ipcRenderer.invoke('hide-to-tray'),
    quitApp: (): Promise<void> => ipcRenderer.invoke('quit-app'),
    showHostWidget: (): Promise<void> => ipcRenderer.invoke('show-host-widget'),
    hideHostWidget: (): Promise<void> => ipcRenderer.invoke('hide-host-widget'),
    resizeToVideoRatio: (width: number, height: number) =>
      ipcRenderer.invoke('app:resize-to-video-ratio', width, height),
    resetAspectRatio: () => ipcRenderer.invoke('app:reset-aspect-ratio'),

    setHostTrayMode: (active: boolean): Promise<void> =>
      ipcRenderer.invoke('set-host-tray-mode', active)
  },
  input: {
    moveAbsolute: (x: number, y: number): Promise<void> =>
      ipcRenderer.invoke('input:move-absolute', x, y),

    mouseAction: (button: string, action: string, x: number, y: number): Promise<void> =>
      ipcRenderer.invoke('input:mouse-action', button, action, x, y),

    keyboardEvent: (keyCode: string, action: string): Promise<void> =>
      ipcRenderer.invoke('input:keyboard-event', keyCode, action),
    scrollMouse: (deltaY: number): Promise<void> =>
      ipcRenderer.invoke('input:scroll-mouse', deltaY),
    getHostScreenSize: (): Promise<{ width: number; height: number }> =>
      ipcRenderer.invoke('input:get-host-screen-size')
  },

  events: {
    onToggleMic: (callback: () => void) => {
      ipcRenderer.on('tray-toggle-mic', callback)
    },
    onStopSession: (callback: () => void) => {
      ipcRenderer.on('tray-stop-session', callback)
      ipcRenderer.on('host-session-ended', callback)
    },

    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('tray-toggle-mic')
      ipcRenderer.removeAllListeners('tray-stop-session')
      ipcRenderer.removeAllListeners('host-session-ended')
    }
  }
}

const sharedTextureReleaseSymbol = Symbol('sharedTextureRelease')

type VideoFrameWithRelease = VideoFrame & {
  [sharedTextureReleaseSymbol]?: () => void
}

const wrapFrameWithRelease = (frame: VideoFrame, releaseTexture: () => void): VideoFrame => {
  let closed = false
  const originalClose = frame.close.bind(frame)
  const wrappedFrame = frame as VideoFrameWithRelease

  wrappedFrame[sharedTextureReleaseSymbol] = releaseTexture
  wrappedFrame.close = (): void => {
    if (closed) return
    closed = true
    try {
      originalClose()
    } catch {
      // ignore close errors
    }
    releaseTexture()
  }

  return wrappedFrame
}

const frameConsumers = new Set<(frame: VideoFrame) => void>()

const addFrameConsumer = (callback: (frame: VideoFrame) => void): (() => void) => {
  frameConsumers.add(callback)
  return () => {
    frameConsumers.delete(callback)
    if (frameConsumers.size === 0) {
      ipcRenderer.postMessage('capture:stop-stream', null)
    }
  }
}

const dispatchFrame = (frame: VideoFrame): void => {
  const consumers = Array.from(frameConsumers)
  if (consumers.length === 0) {
    frame.close()
    return
  }

  if (consumers.length === 1) {
    consumers[0](frame)
  } else {
    for (let i = 0; i < consumers.length; i++) {
      const isLast = i === consumers.length - 1
      let frameToDeliver = isLast ? frame : frame.clone()
      const releaseTexture = (frame as VideoFrameWithRelease)[sharedTextureReleaseSymbol]
      if (releaseTexture) {
        frameToDeliver = wrapFrameWithRelease(frameToDeliver, releaseTexture)
      }
      try {
        consumers[i]!(frameToDeliver)
      } catch (e) {
        console.error('[Preload] Error delivering frame:', e)
        frameToDeliver.close()
      }
    }
  }
}

const registerSharedTextureReceiver = (): void => {
  const receiverApi = sharedTexture as unknown as {
    registerReceiver?: () => void
  }

  if (receiverApi && typeof receiverApi.registerReceiver === 'function') {
    receiverApi.registerReceiver()
  }
}

try {
  sharedTexture.setSharedTextureReceiver(async (data) => {
    let released = false
    const releaseTexture = (): void => {
      if (!released) {
        released = true
        try {
          data.importedSharedTexture.release()
        } catch {
          // ignorujemy błędy zwalniania tekstury
        }
      }
    }

    try {
      const frame = data.importedSharedTexture.getVideoFrame()
      if (frame) {
        const wrappedFrame = wrapFrameWithRelease(frame, releaseTexture)
        dispatchFrame(wrappedFrame)
      } else {
        releaseTexture()
      }
    } catch (e) {
      console.error('[Preload] Odbiór klatki sharedTexture:', e)
      releaseTexture()
    }
  })
} catch (e) {
  console.error('[Preload] Failed to set shared texture receiver:', e)
}

interface RawFramePayload {
  buffer: ArrayBuffer | Uint8Array
  width: number
  height: number
  stride: number
  format: number
}

ipcRenderer.on('capture:raw-frame', async (_, rawFrame: RawFramePayload) => {
  if (!rawFrame) {
    return
  }

  try {
    let pixelData: Uint8ClampedArray

    if (rawFrame.buffer instanceof ArrayBuffer) {
      pixelData = new Uint8ClampedArray(rawFrame.buffer)
    } else {
      pixelData = new Uint8ClampedArray(
        rawFrame.buffer.buffer as ArrayBuffer,
        rawFrame.buffer.byteOffset,
        rawFrame.buffer.byteLength
      )
    }

    // const imageData = new ImageData(
    //   pixelData as unknown as ImageDataArray,
    //   rawFrame.width,
    //   rawFrame.height
    // )
    // const bitmap = await createImageBitmap(imageData)
    // const frame = new VideoFrame(bitmap, { timestamp: performance.now() * 1000 })
    const frame = new VideoFrame(pixelData, {
      format: 'RGBA',
      codedWidth: rawFrame.width,
      codedHeight: rawFrame.height,
      timestamp: performance.now() * 1000
    })

    dispatchFrame(frame)
  } catch (e) {
    console.error('[Preload] Odbiór surowej klatki:', e)
  }
})

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    contextBridge.exposeInMainWorld('recorder', recorder)

    contextBridge.exposeInMainWorld('capture', {
      start: () => ipcRenderer.invoke('capture:start'),
      stop: () => ipcRenderer.invoke('capture:stop'),
      getFps: () => ipcRenderer.invoke('capture:getFps'),
      subscribeStream: (onFrame: (frame: VideoFrame) => void) => {
        const cleanupSubscription = addFrameConsumer(onFrame)

        const cleanup = (): void => {
          cleanupSubscription()
        }
        window.addEventListener('beforeunload', cleanup, { once: true })

        // Request main to start sending frames to this frame
        ipcRenderer.postMessage('capture:request-stream', null)

        return () => {
          window.removeEventListener('beforeunload', cleanup)
          cleanup()
        }
      }
    })

    contextBridge.exposeInMainWorld('screenCapture', {
      requestStream: () => {
        void ipcRenderer.invoke('capture:start')
        ipcRenderer.postMessage('capture:request-stream', null)
      },
      stopStream: () => {
        ipcRenderer.postMessage('capture:stop-stream', null)
        void ipcRenderer.invoke('capture:stop')
      },
      registerReceiver: () => {
        registerSharedTextureReceiver()
      },
      onFrameReceived: (callback: (frame: VideoFrame) => void) => {
        const cleanupSubscription = addFrameConsumer(callback)

        return () => {
          cleanupSubscription()
        }
      },
      shouldUseCpu: async (): Promise<boolean> => {
        return ipcRenderer.invoke('capture:should-use-cpu')
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.recorder = recorder
}
