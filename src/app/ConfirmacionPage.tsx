import { useEffect, useState } from 'react'

interface Purchase {
  hours: number
  amount_eur: number
  voucher_code: string
  created_at: string
  name: string
}

const cell: React.CSSProperties = {
  padding: '0.6rem 0.5rem',
  borderBottom: '1px solid #e5e7eb',
}

export default function ConfirmacionPage() {
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('order')
    if (!order) {
      setError('No se encontró el número de pedido en la URL.')
      return
    }

    let attempts = 0
    async function poll() {
      attempts++
      try {
        const res = await fetch(`/api/confirmacion?order=${order}`)
        if (res.ok) {
          const data = (await res.json()) as { found: boolean; purchase: Purchase }
          if (data.found) {
            setPurchase(data.purchase)
            return
          }
        }
      } catch { /* network hiccup — keep polling */ }

      if (attempts < 4) {
        setTimeout(poll, 1000)
      } else {
        setError('El pago está siendo procesado. Puede tardar unos segundos más. Recarga la página si no ves la confirmación.')
      }
    }

    poll()
  }, [])

  if (error) {
    return (
      <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <a href="/">Volver al inicio</a>
      </main>
    )
  }

  if (!purchase) {
    return (
      <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        <p>Confirmando pago…</p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: '#16a34a' }}>Pago confirmado</h1>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '1rem' }}>
        <tbody>
          <tr>
            <td style={cell}>Titular</td>
            <td style={cell}><strong>{purchase.name}</strong></td>
          </tr>
          <tr>
            <td style={cell}>Horas compradas</td>
            <td style={cell}><strong>{purchase.hours} h</strong></td>
          </tr>
          <tr>
            <td style={cell}>Importe pagado</td>
            <td style={cell}><strong>€{purchase.amount_eur.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td style={cell}>Código de vale</td>
            <td style={cell}>
              <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                {purchase.voucher_code}
              </strong>
            </td>
          </tr>
          <tr>
            <td style={cell}>Fecha</td>
            <td style={cell}>{new Date(purchase.created_at).toLocaleString('es-ES')}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: '1.5rem', color: '#6b7280' }}>
        Guarda este código — preséntaselo a Francisco cuando vayas a regar.
      </p>
      <a href="/" style={{ display: 'inline-block', marginTop: '1rem' }}>Comprar más horas</a>
    </main>
  )
}
