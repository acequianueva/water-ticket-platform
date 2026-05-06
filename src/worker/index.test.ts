import { describe, expect, it } from 'vitest'
import { app } from './index'
import { buildMerchantParams, sign } from './redsys'

// 'abcdefghijklmnopqrstuvwx' base64-encoded → valid 24-byte 3DES key
const TEST_KEY = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4'

type Purchase = {
  user_id: number; season_id: number; hours: number
  amount_eur: number; payment_ref: string; voucher_code: string
  name: string; created_at: string
}

function makeEnv(seedPurchases: Purchase[] = []) {
  const kv: Record<string, string> = {}
  const purchases = [...seedPurchases]

  const DB = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes('SELECT id')) {
            return purchases.find((p) => p.payment_ref === args[0]) ? { id: 1 } : null
          }
          // confirmacion JOIN query
          return purchases.find((p) => p.payment_ref === args[0]) ?? null
        },
        run: async () => {
          if (sql.includes('INSERT INTO purchases')) {
            purchases.push({
              user_id: args[0] as number, season_id: args[1] as number,
              hours: args[2] as number, amount_eur: args[3] as number,
              payment_ref: args[4] as string, voucher_code: args[5] as string,
              name: 'Test User', created_at: new Date().toISOString(),
            })
          }
        },
      }),
    }),
  }

  const SESSIONS = {
    put: async (key: string, value: string) => { kv[key] = value },
    get: async (key: string) => kv[key] ?? null,
    delete: async (key: string) => { delete kv[key] },
  }

  return {
    DB, SESSIONS, VOUCHERS: {},
    'REDSYS_SECRET_KEY-SHA_256': TEST_KEY,
    'REDSYS_SECRET_KEY-SHA_512': TEST_KEY,
    REDSYS_MERCHANT_CODE: '999008881',
    REDSYS_TERMINAL: '1',
    RESEND_API_KEY: 'test',
    SESSION_SECRET: 'deadbeef',
    purchases, // expose so tests can inspect post-mutation state
  }
}

// ── /api/hello ────────────────────────────────────────────────────────────────

describe('GET /api/hello', () => {
  it('returns 200 with a greeting', async () => {
    const res = await app.request('http://localhost/api/hello')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe('Bienvenido a Acequia Nueva')
  })

  it('includes CORS header', async () => {
    const res = await app.request('http://localhost/api/hello', {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})

// ── POST /api/pay ─────────────────────────────────────────────────────────────

describe('POST /api/pay', () => {
  it('returns 400 for 0 hours', async () => {
    const res = await app.request(
      'http://localhost/api/pay',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 0 }) },
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for 11 hours', async () => {
    const res = await app.request(
      'http://localhost/api/pay',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 11 }) },
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('returns Redsys params for a valid request', async () => {
    const res = await app.request(
      'http://localhost/api/pay',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 3 }) },
      makeEnv(),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, string>
    expect(body.Ds_SignatureVersion).toBe('HMAC_SHA256_V1')
    expect(body.Ds_MerchantParameters).toBeTruthy()
    expect(body.Ds_Signature).toBeTruthy()
    expect(body.order).toMatch(/^\d{8}[A-Z0-9]{4}$/)
  })

  it('parks the pending order in KV with correct hours', async () => {
    const env = makeEnv()
    const res = await app.request(
      'http://localhost/api/pay',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 5 }) },
      env,
    )
    const { order } = (await res.json()) as { order: string }
    const stored = await env.SESSIONS.get(`redsys:order:${order}`)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).hours).toBe(5)
  })

  it('sets amount to hours × 1200 cents', async () => {
    const env = makeEnv()
    const res = await app.request(
      'http://localhost/api/pay',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 2 }) },
      env,
    )
    const { order } = (await res.json()) as { order: string }
    const stored = JSON.parse((await env.SESSIONS.get(`redsys:order:${order}`))!)
    expect(stored.amountEur).toBe(24)
  })
})

// ── POST /api/redsys/notify ───────────────────────────────────────────────────

function notifyBody(params: Record<string, string>, key: string, order: string) {
  const Ds_MerchantParameters = buildMerchantParams(params)
  const Ds_Signature = sign(key, order, Ds_MerchantParameters)
  return new URLSearchParams({
    Ds_SignatureVersion: 'HMAC_SHA256_V1',
    Ds_MerchantParameters,
    Ds_Signature,
  }).toString()
}

describe('POST /api/redsys/notify', () => {
  it('returns 400 for missing Ds_MerchantParameters', async () => {
    const res = await app.request(
      'http://localhost/api/redsys/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'Ds_SignatureVersion=HMAC_SHA256_V1',
      },
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid signature', async () => {
    const params = buildMerchantParams({ Ds_Order: '20260506TEST', Ds_Response: '0000' })
    const res = await app.request(
      'http://localhost/api/redsys/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          Ds_SignatureVersion: 'HMAC_SHA256_V1',
          Ds_MerchantParameters: params,
          Ds_Signature: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        }).toString(),
      },
      makeEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 and skips insert for a declined response code', async () => {
    const env = makeEnv()
    const order = '20260506DCLN'
    await env.SESSIONS.put(`redsys:order:${order}`, JSON.stringify({ userId: 1, seasonId: 1, hours: 3, amountEur: 36 }))

    const res = await app.request(
      'http://localhost/api/redsys/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: notifyBody({ Ds_Order: order, Ds_Response: '0190' }, TEST_KEY, order),
      },
      env,
    )
    expect(res.status).toBe(200)
    expect(env.purchases).toHaveLength(0)
  })

  it('inserts a purchase and cleans up KV for a valid approved notification', async () => {
    const env = makeEnv()
    const order = '20260506APPR'
    await env.SESSIONS.put(`redsys:order:${order}`, JSON.stringify({ userId: 1, seasonId: 1, hours: 3, amountEur: 36 }))

    const res = await app.request(
      'http://localhost/api/redsys/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: notifyBody({ Ds_Order: order, Ds_Response: '0000' }, TEST_KEY, order),
      },
      env,
    )
    expect(res.status).toBe(200)
    expect(env.purchases).toHaveLength(1)
    expect(env.purchases[0].payment_ref).toBe(order)
    expect(env.purchases[0].voucher_code).toMatch(/^ACE-\d{8}-[A-Z0-9]{6}$/)
    expect(await env.SESSIONS.get(`redsys:order:${order}`)).toBeNull()
  })

  it('is idempotent — second notification for the same order is ignored', async () => {
    const order = '20260506IDEM'
    const env = makeEnv([
      { user_id: 1, season_id: 1, hours: 3, amount_eur: 36, payment_ref: order, voucher_code: 'ACE-20260506-ABC123', name: 'Test', created_at: '' },
    ])

    const res = await app.request(
      'http://localhost/api/redsys/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: notifyBody({ Ds_Order: order, Ds_Response: '0000' }, TEST_KEY, order),
      },
      env,
    )
    expect(res.status).toBe(200)
    expect(env.purchases).toHaveLength(1) // no duplicate
  })
})

// ── GET /api/confirmacion ─────────────────────────────────────────────────────

describe('GET /api/confirmacion', () => {
  it('returns 400 when order query param is missing', async () => {
    const res = await app.request('http://localhost/api/confirmacion', {}, makeEnv())
    expect(res.status).toBe(400)
  })

  it('returns 404 when order is not in the database', async () => {
    const res = await app.request('http://localhost/api/confirmacion?order=NOTFOUND', {}, makeEnv())
    expect(res.status).toBe(404)
    const body = (await res.json()) as { found: boolean }
    expect(body.found).toBe(false)
  })

  it('returns the purchase when found', async () => {
    const env = makeEnv([
      { user_id: 1, season_id: 1, hours: 4, amount_eur: 48, payment_ref: '20260506FIND', voucher_code: 'ACE-20260506-FIND00', name: 'Federico', created_at: '2026-05-06T12:00:00Z' },
    ])
    const res = await app.request('http://localhost/api/confirmacion?order=20260506FIND', {}, env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { found: boolean; purchase: { hours: number; voucher_code: string } }
    expect(body.found).toBe(true)
    expect(body.purchase.hours).toBe(4)
    expect(body.purchase.voucher_code).toBe('ACE-20260506-FIND00')
  })
})
