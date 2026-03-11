import crypto from 'node:crypto'

export type EncryptedPayload = {
  payload: {
    iv: string
    tag: string
    data: string
  }
}

export function decryptPayload(p: EncryptedPayload): object {
  const { payload } = p
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const encrypted = Buffer.from(payload.data, 'base64')

  //! TODO: Find a better way to manage the key (should not be bundled with the app)
  //@ts-ignore (define in .env)
  const key = import.meta.env.VITE_ENCRYPTION_KEY
  console.log('Decrypting payload')
  if (!key) {
    throw new Error('Encryption key is not defined')
  }
  const keyBuffer = Buffer.from(key, 'hex')

  // Validate cryptographic parameters before decryption to avoid low-level crypto errors.
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes for AES-256-GCM, got ${keyBuffer.length}`
    )
  }

  // AES-GCM commonly uses a 12-byte IV/nonce.
  if (iv.length !== 12) {
    throw new Error(
      `Invalid IV length for AES-256-GCM: expected 12 bytes, got ${iv.length}`
    )
  }

  // The authentication tag is typically 16 bytes for AES-GCM.
  if (tag.length !== 16) {
    throw new Error(
      `Invalid authentication tag length for AES-256-GCM: expected 16 bytes, got ${tag.length}`
    )
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)

  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  //! Wrap in try-catch (json parse is throwable)
  return JSON.parse(decrypted.toString())
}
