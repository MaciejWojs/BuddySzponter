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
  console.log('Decrypting payload with key:', key)
  if (!key) {
    throw new Error('Encryption key is not defined')
  }
  const keyBuffer = Buffer.from(key, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)

  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  //! Wrap in try-catch (json parse is throwable)
  return JSON.parse(decrypted.toString())
}
