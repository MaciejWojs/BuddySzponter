// shared/schemas/p2pProtocol.ts
import { z } from 'zod'

export const P2PMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CHAT'),
    payload: z.object({
      text: z.string().min(1),
      sender: z.string()
    })
  }),

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
      button: z.enum(['left', 'right', 'middle']),
      action: z.enum(['click', 'double', 'down', 'up']),
      x: z.number().min(0),
      y: z.number().min(0)
    })
  }),

  // NOWE: Klawiatura
  z.object({
    type: z.literal('KEYBOARD_EVENT'),
    payload: z.object({
      keyCode: z.string(),
      action: z.enum(['down', 'up'])
    })
  }),

  z.object({
    type: z.literal('HID_HANDSHAKE'),
    payload: z.object({
      screenWidth: z.number().min(1),
      screenHeight: z.number().min(1),
      isControlGranted: z.boolean()
    })
  }),

  z.object({
    type: z.literal('HID_PERMISSION_UPDATE'),
    payload: z.object({
      isControlGranted: z.boolean()
    })
  }),

  z.object({
    type: z.literal('CONTROL'),
    payload: z.object({
      action: z.enum(['PAUSE_VIDEO', 'RESUME_VIDEO', 'LOWER_QUALITY'])
    })
  }),

  z.object({
    type: z.literal('METRICS'),
    payload: z.object({
      fps: z.number().nullable(),
      qualityPreset: z.enum(['low', 'medium', 'high']).nullable(),
      rttMs: z.number().nullable(),
      cpuLoadPct: z.number().nullable(),
      timestamp: z.number().int()
    })
  }),

  z.object({
    type: z.literal('DISCONNECT'),
    payload: z.object({})
  })
])

export type P2PMessage = z.infer<typeof P2PMessageSchema>
