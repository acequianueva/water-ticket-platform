import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { buildMerchantParams, generateOrderId, sign, SIGNATURE_VERSION, TPV_URL, verifyAndDecode } from './redsys'

export const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

app.get('/api/hello', (c) => {
  return c.json({ message: 'Bienvenido a Acequia Nueva' })
})

// ── Payment initiation ────────────────────────────────────────────────────────

app.post('/api/pay', async (c) => {
  const secretKey = c.env['REDSYS_SECRET_KEY-SHA_512']

  // Verify secrets are present on first use — logs appear in `wrangler tail`
  console.log(JSON.stringify({
    event: 'pay.init',
    merchant_code: c.env.REDSYS_MERCHANT_CODE || '(missing)',
    terminal: c.env.REDSYS_TERMINAL || '(missing)',
    secret_key_present: !!secretKey,
    tpv_url: TPV_URL,
  }))

  if (!secretKey) {
    console.error('pay.error: REDSYS_SECRET_KEY-SHA_512 is not set')
    return c.json({ error: 'Payment gateway not configured' }, 503)
  }

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
  const Ds_Signature = sign(secretKey, order, Ds_MerchantParameters)

  await c.env.SESSIONS.put(
    `redsys:order:${order}`,
    JSON.stringify({ userId: 1, seasonId: 1, hours, amountEur: hours * 12 }),
    { expirationTtl: 3600 },
  )

  console.log(JSON.stringify({
    event: 'pay.created',
    order,
    hours,
    amount_eur: hours * 12,
    notify_url: paramsObj.DS_MERCHANT_MERCHANTURL,
  }))

  return c.json({ Ds_MerchantParameters, Ds_SignatureVersion: SIGNATURE_VERSION, Ds_Signature, tpvUrl: TPV_URL, order })
})

// ── Redsys server-to-server notification ─────────────────────────────────────

app.post('/api/redsys/notify', async (c) => {
  const body = await c.req.parseBody()
  const { Ds_MerchantParameters, Ds_Signature, Ds_SignatureVersion } = body as Record<string, string>

  console.log(JSON.stringify({
    event: 'notify.received',
    signature_version: Ds_SignatureVersion ?? '(missing)',
    has_params: !!Ds_MerchantParameters,
    has_signature: !!Ds_Signature,
    caller_ip: c.req.header('cf-connecting-ip') ?? 'unknown',
  }))

  if (Ds_SignatureVersion !== SIGNATURE_VERSION || !Ds_MerchantParameters || !Ds_Signature) {
    console.error(JSON.stringify({ event: 'notify.rejected', reason: 'missing_fields' }))
    return c.text('Bad request', 400)
  }

  const { params, valid } = verifyAndDecode(c.env['REDSYS_SECRET_KEY-SHA_512'], Ds_MerchantParameters, Ds_Signature)

  if (!valid) {
    console.error(JSON.stringify({ event: 'notify.rejected', reason: 'invalid_signature' }))
    return c.text('Invalid signature', 400)
  }

  const order = params.Ds_Order
  const responseCode = parseInt(params.Ds_Response ?? '9999', 10)

  console.log(JSON.stringify({
    event: 'notify.parsed',
    order,
    response_code: params.Ds_Response,
    approved: responseCode >= 0 && responseCode <= 99,
    auth_code: params.Ds_AuthorisationCode ?? null,
    secure_payment: params.Ds_SecurePayment ?? null,
    card_country: params.Ds_Card_Country ?? null,
  }))

  if (responseCode < 0 || responseCode > 99) {
    console.log(JSON.stringify({ event: 'notify.declined', order, response_code: params.Ds_Response }))
    return c.text('OK', 200)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM purchases WHERE payment_ref = ?').bind(order).first()
  if (existing) {
    console.log(JSON.stringify({ event: 'notify.duplicate', order }))
    return c.text('OK', 200)
  }

  const pendingRaw = await c.env.SESSIONS.get(`redsys:order:${order}`)
  if (!pendingRaw) {
    console.error(JSON.stringify({ event: 'notify.error', reason: 'no_pending_order_in_kv', order }))
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

  console.log(JSON.stringify({
    event: 'notify.purchase_created',
    order,
    user_id: userId,
    hours,
    amount_eur: amountEur,
    voucher_code: voucherCode,
  }))

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
