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
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100)
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
