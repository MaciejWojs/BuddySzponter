import { z } from 'zod'

export const BaseMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown()
})

export const ChatPayloadSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('create'),
    id: z.string().min(1),
    text: z.string().min(1),
    sender: z.string().min(1),
    authorId: z.string().min(1),
    at: z.number().int()
  }),
  z.object({
    op: z.literal('edit'),
    id: z.string().min(1),
    text: z.string().min(1),
    at: z.number().int()
  }),
  z.object({
    op: z.literal('delete'),
    id: z.string().min(1),
    at: z.number().int()
  }),
  z.object({
    op: z.literal('file'),
    id: z.string().min(1),
    transferId: z.string().min(1),
    files: z
      .array(
        z.object({
          name: z.string().min(1),
          size: z.number().int().nonnegative()
        })
      )
      .min(1),
    sender: z.string().min(1),
    authorId: z.string().min(1),
    at: z.number().int()
  })
])

export const ChatSchema = z.object({
  type: z.literal('CHAT'),
  payload: ChatPayloadSchema
})

export const HidControlSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MOUSE_MOVE'),
    payload: z.object({
      x: z.number().min(0),
      y: z.number().min(0)
    })
  }),
  z.object({
    type: z.literal('MOUSE_ACTION'),
    payload: z.object({
      button: z.enum(['l', 'r', 'm']),
      action: z.enum(['c', 'dc', 'd', 'u']),
      x: z.number().min(0),
      y: z.number().min(0)
    })
  }),
  z.object({
    type: z.literal('KEYBOARD_EVENT'),
    payload: z.object({
      keyCode: z.string(),
      action: z.enum(['down', 'up', 'd', 'u'])
    })
  }),
  z.object({
    type: z.literal('MOUSE_SCROLL'),
    payload: z.object({
      deltaY: z.number()
    })
  }),
  z.object({
    type: z.literal('HID_HANDSHAKE'),
    payload: z.object({
      screenWidth: z.number().min(1),
      screenHeight: z.number().min(1),
      isControlGranted: z.boolean(),
      cursorType: z.string().optional(),
      clipboardSyncEnabled: z.boolean().optional()
    })
  }),
  z.object({
    type: z.literal('HID_PERMISSION_UPDATE'),
    payload: z.object({
      isControlGranted: z.boolean()
    })
  }),
  z.object({
    type: z.literal('HID_CURSOR_SYNC'),
    payload: z.object({
      cursorType: z.string()
    })
  }),
  z.object({
    type: z.literal('CLIPBOARD_SYNC'),
    payload: z.object({
      enabled: z.boolean()
    })
  }),
  z.object({
    type: z.literal('CLIPBOARD_TEXT'),
    payload: z.object({
      text: z.string().max(262_144)
    })
  }),
  z.object({
    type: z.literal('CLIPBOARD_FILES'),
    payload: z.object({
      paths: z.array(z.string().max(4096)).min(1).max(64)
    })
  })
])

export const SystemEventsSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CONTROL'),
    payload: z.object({
      action: z.enum(['PAUSE_VIDEO', 'RESUME_VIDEO', 'LOWER_QUALITY'])
    })
  }),
  z.object({
    type: z.literal('DISCONNECT'),
    payload: z.object({})
  })
])

export const MetricsSchema = z.object({
  type: z.literal('METRICS'),
  payload: z.object({
    fps: z.number().nullable(),
    qualityPreset: z.enum(['low', 'medium', 'high']).nullable(),
    rttMs: z.number().nullable(),
    cpuLoadPct: z.number().nullable(),
    timestamp: z.number().int()
  })
})

export const P2PMessageSchema = z.union([
  ChatSchema,
  HidControlSchema,
  SystemEventsSchema,
  MetricsSchema
])

export type ChatMessage = z.infer<typeof ChatSchema>
export type ChatPayload = z.infer<typeof ChatPayloadSchema>
export type HidControlMessage = z.infer<typeof HidControlSchema>
export type SystemEventsMessage = z.infer<typeof SystemEventsSchema>
export type MetricsMessage = z.infer<typeof MetricsSchema>
export type P2PMessage = z.infer<typeof P2PMessageSchema>
