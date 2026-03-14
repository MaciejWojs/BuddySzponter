import z from 'zod';
export const encryptPayloadSchema = z.object({
  payload: z.object({
    iv: z.base64(),
    tag: z.base64(),
    data: z.base64(),
  }),
});

export type EncryptedPayload = z.infer<typeof encryptPayloadSchema>;
