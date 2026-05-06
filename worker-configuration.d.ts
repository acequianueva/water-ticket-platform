/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  VOUCHERS: R2Bucket
  REDSYS_SECRET_KEY: string
  REDSYS_MERCHANT_CODE: string
  REDSYS_TERMINAL: string
  RESEND_API_KEY: string
  SESSION_SECRET: string
}
