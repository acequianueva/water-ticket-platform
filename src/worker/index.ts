import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { buildMerchantParams, generateOrderId, sign, TPV_URL, verifyAndDecode } from './redsys'

export const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

app.get('/api/hello', (c) => {
  return c.json({ message: 'Bienvenido a Acequia Nueva' })
})

// ── Payment initiation ────────────────────────────────────────────────────────

app.post('/api/pay', async (c) => {
  const { hours } = await c.req.json<{ hours: number }>()
  if (!hours || hours < 1 || hours > 10) {
    return c.json({ error: 'hours must be between 1 and 10' }, 400)
  }

  const order = generateOrderId()
  const amount = (hours * 1200).toString() // Redsys amounts are in euro-cents
  const baseUrl = new URL(c.req.url).origin

  const paramsObj: Record<string, string> = {
    DS_MERCHANT_AMOUNT: amount,
    DS_MERCHANT_ORDER: order,
    DS_MERCHANT_MERCHANTCODE: c.env.REDSYS_MERCHANT_CODE,
    DS_MERCHANT_CURRENCY: '978', // EUR
    DS_MERCHANT_TRANSACTIONTYPE: '0', // authorisation
    DS_MERCHANT_TERMINAL: c.env.REDSYS_TERMINAL,
    DS_MERCHANT_MERCHANTURL: `${baseUrl}/api/redsys/notify`,
    DS_MERCHANT_URLOK: `${baseUrl}/confirmacion?order=${order}`,
    DS_MERCHANT_URLKO: `${baseUrl}/buy?error=payment_failed`,
  }

  const Ds_MerchantParameters = buildMerchantParams(paramsObj)
  const Ds_Signature = sign(c.env['REDSYS_SECRET_KEY-SHA_256'], order, Ds_MerchantParameters)

  // Park the pending order so the notification handler can resolve user + season
  await c.env.SESSIONS.put(
    `redsys:order:${order}`,
    JSON.stringify({ userId: 1, seasonId: 1, hours, amountEur: hours * 12 }),
    { expirationTtl: 3600 },
  )

  return c.json({ Ds_MerchantParameters, Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_Signature, tpvUrl: TPV_URL, order })
})

// ── Redsys server-to-server notification ─────────────────────────────────────

app.post('/api/redsys/notify', async (c) => {
  const body = await c.req.parseBody()
  const { Ds_MerchantParameters, Ds_Signature, Ds_SignatureVersion } = body as Record<string, string>

  if (Ds_SignatureVersion !== 'HMAC_SHA256_V1' || !Ds_MerchantParameters || !Ds_Signature) {
    return c.text('Bad request', 400)
  }

  const { params, valid } = verifyAndDecode(c.env['REDSYS_SECRET_KEY-SHA_256'], Ds_MerchantParameters, Ds_Signature)
  if (!valid) {
    console.error('Redsys: invalid signature')
    return c.text('Invalid signature', 400)
  }

  const order = params.Ds_Order
  const responseCode = parseInt(params.Ds_Response ?? '9999', 10)

  // 0000–0099 = approved; everything else = declined / error
  if (responseCode < 0 || responseCode > 99) {
    console.log(`Redsys: declined order=${order} code=${params.Ds_Response}`)
    return c.text('OK', 200)
  }

  // Idempotency: skip if we already recorded this order
  const existing = await c.env.DB.prepare('SELECT id FROM purchases WHERE payment_ref = ?').bind(order).first()
  if (existing) return c.text('OK', 200)

  const pendingRaw = await c.env.SESSIONS.get(`redsys:order:${order}`)
  if (!pendingRaw) {
    console.error(`Redsys: no pending order in KV for ${order}`)
    return c.text('OK', 200)
  }

  const { userId, seasonId, hours, amountEur } = JSON.parse(pendingRaw) as {
    userId: number; seasonId: number; hours: number; amountEur: number
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const voucherCode = `ACE-${today}-${suffix}`

  await c.env.DB.prepare(
    'INSERT INTO purchases (user_id, season_id, hours, amount_eur, payment_ref, voucher_code) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(userId, seasonId, hours, amountEur, order, voucherCode).run()

  await c.env.SESSIONS.delete(`redsys:order:${order}`)

  return c.text('OK', 200)
})

// ── Confirmation lookup ───────────────────────────────────────────────────────

app.get('/api/confirmacion', async (c) => {
  const order = c.req.query('order')
  if (!order) return c.json({ error: 'missing order' }, 400)

  const purchase = await c.env.DB.prepare(
    `SELECT p.hours, p.amount_eur, p.voucher_code, p.created_at, u.name
     FROM purchases p JOIN users u ON u.id = p.user_id
     WHERE p.payment_ref = ?`,
  ).bind(order).first()

  if (!purchase) return c.json({ found: false }, 404)
  return c.json({ found: true, purchase })
})

export default app
