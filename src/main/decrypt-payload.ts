import crypto from 'node:crypto'
import { EncryptedPayload } from './schemas/encryptedPayloadSchema'

// Decrypts payloads received from backend (AES-256-GCM)
export function decryptPayload(p: EncryptedPayload): object {
  const { payload } = p
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const encrypted = Buffer.from(payload.data, 'base64')

  //@ts-ignore (define in .env)
  const key = import.meta.env.VITE_ENCRYPTION_KEY
  if (!key) throw new Error('Encryption key is not defined')
  const keyBuffer = Buffer.from(key, 'hex')
  if (keyBuffer.length !== 32) throw new Error('Invalid encryption key length')
  if (iv.length !== 12) throw new Error('Invalid IV length for AES-256-GCM')
  if (tag.length !== 16) throw new Error('Invalid authentication tag length for AES-256-GCM')

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString())
}
