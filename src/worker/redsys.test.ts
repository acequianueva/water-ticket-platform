import { describe, expect, it } from 'vitest'
import { buildMerchantParams, deriveOrderKey, generateOrderId, sign, verifyAndDecode } from './redsys'

// HMAC_SHA512_V2: merchant key is used raw; first 16 chars become the AES-128 key.
// Using the publicly documented Redsys test key.
const TEST_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'
const TEST_ORDER = '20260506ABCD'

describe('generateOrderId', () => {
  it('is 12 characters long', () => {
    expect(generateOrderId()).toHaveLength(12)
  })

  it('starts with 8 digits (YYYYMMDD) followed by 4 uppercase alphanum chars', () => {
    expect(generateOrderId()).toMatch(/^\d{8}[A-Z0-9]{4}$/)
  })

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateOrderId()))
    expect(ids.size).toBe(20)
  })
})

describe('buildMerchantParams', () => {
  it('round-trips through base64url JSON', () => {
    const params = { DS_MERCHANT_AMOUNT: '3600', DS_MERCHANT_ORDER: TEST_ORDER }
    const encoded = buildMerchantParams(params)
    // base64url has no +, /, or = characters
    expect(encoded).not.toMatch(/[+/=]/)
    // round-trip: restore padding and decode
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    expect(JSON.parse(Buffer.from(padded, 'base64').toString())).toEqual(params)
  })
})

describe('deriveOrderKey', () => {
  it('returns a base64 string of the AES-encrypted order', () => {
    const key = deriveOrderKey(TEST_KEY, '1234567890')
    // Must be standard base64 (not base64url) and decode to 16 bytes (one AES block)
    expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(Buffer.from(key, 'base64').length).toBe(16)
  })

  it('produces a different key for a different order', () => {
    expect(deriveOrderKey(TEST_KEY, '1234567890')).not.toBe(deriveOrderKey(TEST_KEY, '0987654321'))
  })
})

describe('sign', () => {
  it('produces a non-empty base64url string', () => {
    const params = buildMerchantParams({ Ds_Order: TEST_ORDER, Ds_Response: '0000' })
    const sig = sign(TEST_KEY, TEST_ORDER, params)
    expect(sig.length).toBeGreaterThan(20)
    // base64url: no +, /, or =
    expect(sig).not.toMatch(/[+/=]/)
  })

  it('produces a different signature for a different order', () => {
    const params = buildMerchantParams({ Ds_Order: TEST_ORDER, Ds_Response: '0000' })
    const sig1 = sign(TEST_KEY, TEST_ORDER, params)
    const sig2 = sign(TEST_KEY, '20260507WXYZ', params)
    expect(sig1).not.toBe(sig2)
  })
})

describe('verifyAndDecode', () => {
  it('accepts a valid signature and returns decoded params', () => {
    const params = buildMerchantParams({ Ds_Order: TEST_ORDER, Ds_Response: '0000' })
    const sig = sign(TEST_KEY, TEST_ORDER, params)
    const { valid, params: decoded } = verifyAndDecode(TEST_KEY, params, sig)
    expect(valid).toBe(true)
    expect(decoded.Ds_Order).toBe(TEST_ORDER)
    expect(decoded.Ds_Response).toBe('0000')
  })

  it('rejects a tampered signature', () => {
    const params = buildMerchantParams({ Ds_Order: TEST_ORDER, Ds_Response: '0000' })
    const { valid } = verifyAndDecode(TEST_KEY, params, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    expect(valid).toBe(false)
  })

  it('rejects invalid base64url params without throwing', () => {
    const { valid } = verifyAndDecode(TEST_KEY, '!!!notbase64!!!', 'sig')
    expect(valid).toBe(false)
  })
})
