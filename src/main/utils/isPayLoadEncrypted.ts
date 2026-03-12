import { encryptedPayloadSchema } from '../schemas/encryptedPayloadSchema'

export const isPayLoadEncrypted = (data: object): boolean => {
  const result = encryptedPayloadSchema.safeParse(data)
  return result.success
}
