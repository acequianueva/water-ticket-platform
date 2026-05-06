import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  SESSIONS: KVNamespace
  VOUCHERS: R2Bucket
}

export const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.get('/api/hello', (c) => {
  return c.json({ message: 'Bienvenido a Acequia Nueva' })
})

export default app
