import { describe, expect, it } from 'vitest'
import { buildMerchantParams, generateOrderId, sign, verifyAndDecode } from './redsys'

// 'abcdefghijklmnopqrstuvwx' base64-encoded → 24-byte key, valid for 3DES
const TEST_KEY = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4'
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
  it('round-trips through base64 JSON', () => {
    const params = { DS_MERCHANT_AMOUNT: '3600', DS_MERCHANT_ORDER: TEST_ORDER }
    const encoded = buildMerchantParams(params)
    expect(JSON.parse(atob(encoded))).toEqual(params)
  })
})

describe('sign', () => {
  it('produces a non-empty base64 string', () => {
    const params = buildMerchantParams({ Ds_Order: TEST_ORDER, Ds_Response: '0000' })
    const sig = sign(TEST_KEY, TEST_ORDER, params)
    expect(sig.length).toBeGreaterThan(20)
    expect(() => atob(sig)).not.toThrow()
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
    const { valid } = verifyAndDecode(TEST_KEY, params, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')
    expect(valid).toBe(false)
  })

  it('rejects invalid base64 params without throwing', () => {
    const { valid } = verifyAndDecode(TEST_KEY, '!!!notbase64!!!', 'sig')
    expect(valid).toBe(false)
  })
})
