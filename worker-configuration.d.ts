/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  VOUCHERS: R2Bucket
  'REDSYS_SECRET_KEY-SHA_512': string  // HMAC_SHA512_V2 signing key (active)
  'REDSYS_SECRET_KEY-SHA_256': string  // kept in Cloudflare but unused
  REDSYS_MERCHANT_CODE: string
  REDSYS_TERMINAL: string
  RESEND_API_KEY: string
  SESSION_SECRET: string
  PURCHASES_ENABLED: string
}
