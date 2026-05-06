import { createCipheriv, createHmac } from 'node:crypto'

export const TPV_URL = 'https://sis-t.redsys.es:25443/sis/realizarPago' // swap to sis.redsys.es for live

export function generateOrderId(): string {
  const d = new Date()
  const date =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return date + rand
}

export function buildMerchantParams(params: Record<string, string>): string {
  return btoa(JSON.stringify(params))
}

function deriveOrderKey(secretKeyB64: string, order: string): Buffer {
  const key = Buffer.from(secretKeyB64, 'base64')
  const iv = Buffer.alloc(8, 0)
  // Pad order to 8-byte block boundary
  const paddedLen = Math.ceil(Math.max(order.length, 8) / 8) * 8
  const orderBuf = Buffer.alloc(paddedLen, 0)
  Buffer.from(order, 'ascii').copy(orderBuf)
  const cipher = createCipheriv('des-ede3-cbc', key, iv)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(orderBuf), cipher.final()])
}

export function sign(secretKeyB64: string, order: string, merchantParams: string): string {
  const orderKey = deriveOrderKey(secretKeyB64, order)
  return createHmac('sha256', orderKey).update(merchantParams).digest('base64')
}

export function verifyAndDecode(
  secretKeyB64: string,
  merchantParams: string,
  signature: string,
): { params: Record<string, string>; valid: boolean } {
  let params: Record<string, string>
  try {
    params = JSON.parse(atob(merchantParams)) as Record<string, string>
  } catch {
    return { params: {}, valid: false }
  }
  const order = params.Ds_Order ?? ''
  const expected = sign(secretKeyB64, order, merchantParams)
  return { params, valid: expected === signature }
}
