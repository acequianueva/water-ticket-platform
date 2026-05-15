import { createCipheriv, createHmac } from 'node:crypto'

// Reference: https://pagosonline.redsys.es/desarrolladores-inicio/documentacion-operativa/autorizacion/
//            https://pagosonline.redsys.es/desarrolladores-inicio/documentacion-operativa/firmar-una-operacion/
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

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(b64url: string): string {
  return b64url.replace(/-/g, '+').replace(/_/g, '/')
}

// Ds_MerchantParameters: JSON encoded as base64URL (per HMAC_SHA512_V2 spec)
export function buildMerchantParams(params: Record<string, string>): string {
  return toBase64Url(Buffer.from(JSON.stringify(params)).toString('base64'))
}

// HMAC_SHA512_V2 key derivation (per official Redsys documentation):
//   1. AES key = first 16 chars of merchant key, right-padded with zeros if shorter
//   2. AES-128-CBC encrypt the order (zero-padded to AES block size) with zero IV
//   3. Base64-encode the result → "diversified key" used as the HMAC-SHA512 key
//
// Test vector from documentation:
//   order "1234567890" → diversified key "RWt3/IPTzYRMXsQtkiGRKg=="
//   (with key "sq7HjrUOBfKmC576ILgskD5srU870gJ7", first 16 chars = "sq7HjrUOBfKmC576")
export function deriveOrderKey(rawKey: string, order: string): string {
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

// HMAC-SHA512 over Ds_MerchantParameters using the diversified key, output in base64URL
export function sign(rawKey: string, order: string, merchantParams: string): string {
  const orderKey = deriveOrderKey(rawKey, order)
  return toBase64Url(
    createHmac('sha512', orderKey).update(merchantParams).digest('base64'),
  )
}

// Verify an incoming Redsys notification and decode its base64URL Ds_MerchantParameters.
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
