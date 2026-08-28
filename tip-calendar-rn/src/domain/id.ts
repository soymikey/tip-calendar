const UUID_VERSION = 0x40
const UUID_VARIANT = 0x80

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  const fill = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)
  if (fill) {
    fill(bytes)
    return bytes
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

export function newEntityId(): string {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  if (randomUUID) {
    return randomUUID()
  }
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | UUID_VERSION
  bytes[8] = (bytes[8] & 0x3f) | UUID_VARIANT
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
