import { createCipheriv, createHmac } from 'node:crypto'

export const TPV_URL = 'https://sis-t.redsys.es:25443/sis/realizarPago' // swap to sis.redsys.es for live
export const SIGNATURE_VERSION = 'HMAC_SHA512_V2'

export function generateOrderId(): string {
  const d = new Date()
  const date =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return date + rand
}

// HMAC_SHA512_V2 uses Base64URL for Ds_MerchantParameters
export function buildMerchantParams(params: Record<string, string>): string {
  return Buffer.from(JSON.stringify(params))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(b64url: string): string {
  return b64url.replace(/-/g, '+').replace(/_/g, '/')
}

// Step 1 — AES-128-CBC key derivation.
// Key: first 16 chars of the raw merchant key string (not base64-decoded).
// Encrypt the order number (zero-padded to AES block boundary) with a zero IV.
// The result is base64-encoded and used as the HMAC key.
function deriveOrderKey(rawKey: string, order: string): string {
  const keyBuf = Buffer.alloc(16, 0)
  Buffer.from(rawKey.substring(0, 16), 'ascii').copy(keyBuf, 0, 0, 16)
  const iv = Buffer.alloc(16, 0)
  const paddedLen = Math.ceil(Math.max(order.length, 16) / 16) * 16
  const orderBuf = Buffer.alloc(paddedLen, 0)
  Buffer.from(order, 'ascii').copy(orderBuf)
  const cipher = createCipheriv('aes-128-cbc', keyBuf, iv)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(orderBuf), cipher.final()]).toString('base64')
}

// Step 2+3 — HMAC-SHA512 over Ds_MerchantParameters, output in Base64URL.
export function sign(rawKey: string, order: string, merchantParams: string): string {
  const orderKey = deriveOrderKey(rawKey, order)
  return toBase64Url(
    createHmac('sha512', orderKey).update(merchantParams).digest('base64'),
  )
}

// Verify an incoming Redsys notification and decode its parameters.
export function verifyAndDecode(
  rawKey: string,
  merchantParams: string,
  signature: string,
): { params: Record<string, string>; valid: boolean } {
  let params: Record<string, string>
  try {
    params = JSON.parse(
      Buffer.from(fromBase64Url(merchantParams), 'base64').toString('utf8'),
    ) as Record<string, string>
  } catch {
    return { params: {}, valid: false }
  }
  const order = params.Ds_Order ?? ''
  const expected = sign(rawKey, order, merchantParams)
  return { params, valid: expected === signature }
}
