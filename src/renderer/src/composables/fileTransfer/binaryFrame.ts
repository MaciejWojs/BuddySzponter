/** Magic `FTR1` — ramki binarne na kanale `file-transfer` (chunki plików). */
export const FILE_CHUNK_MAGIC = 0x31725446
export const FILE_CHUNK_HEADER_BYTES = 16

export function encodeFileChunkFrame(
  fileIndex: number,
  chunkIndex: number,
  payload: Uint8Array
): ArrayBuffer {
  const total = FILE_CHUNK_HEADER_BYTES + payload.byteLength
  const out = new ArrayBuffer(total)
  const view = new DataView(out)
  view.setUint32(0, FILE_CHUNK_MAGIC, true)
  view.setUint16(4, fileIndex, true)
  view.setUint32(6, chunkIndex, true)
  view.setUint32(10, payload.byteLength, true)
  view.setUint16(14, 0, true)
  new Uint8Array(out, FILE_CHUNK_HEADER_BYTES).set(payload)
  return out
}

export function decodeFileChunkFrame(buf: ArrayBuffer): {
  fileIndex: number
  chunkIndex: number
  payload: Uint8Array
} | null {
  if (buf.byteLength < FILE_CHUNK_HEADER_BYTES) return null
  const view = new DataView(buf)
  if (view.getUint32(0, true) !== FILE_CHUNK_MAGIC) return null
  const fileIndex = view.getUint16(4, true)
  const chunkIndex = view.getUint32(6, true)
  const payloadLen = view.getUint32(10, true)
  if (payloadLen < 0 || FILE_CHUNK_HEADER_BYTES + payloadLen > buf.byteLength) return null
  const payload = new Uint8Array(buf, FILE_CHUNK_HEADER_BYTES, payloadLen)
  return { fileIndex, chunkIndex, payload: new Uint8Array(payload) }
}
