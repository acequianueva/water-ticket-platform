import { useEffect, useRef, useState } from 'react'

const PRICE_PER_HOUR = 12

interface RedsysParams {
  Ds_MerchantParameters: string
  Ds_SignatureVersion: string
  Ds_Signature: string
  tpvUrl: string
}

export default function BuyPage({ error }: { error?: string }) {
  const [hours, setHours] = useState(1)
  const [loading, setLoading] = useState(false)
  const [payError, setPayError] = useState(error ?? null)
  const [redsysParams, setRedsysParams] = useState<RedsysParams | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-submit the hidden form once Redsys params are ready
  useEffect(() => {
    if (redsysParams && formRef.current) {
      formRef.current.submit()
    }
  }, [redsysParams])

  async function handlePay() {
    setLoading(true)
    setPayError(null)
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      if (!res.ok) throw new Error('Server error')
      const data = (await res.json()) as RedsysParams
      setRedsysParams(data)
    } catch {
      setPayError('Failed to connect to the payment server. Please try again.')
      setLoading(false)
    }
  }

  const total = (hours * PRICE_PER_HOUR).toFixed(2)

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1>Buy water hours</h1>
      <p style={{ color: '#6b7280' }}>€{PRICE_PER_HOUR} / hour · minimum 1 hour, maximum 10</p>

      {payError && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '6px' }}>
          {payError}
        </p>
      )}

      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Number of hours
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={hours}
          onChange={(e) => setHours(Math.min(10, Math.max(1, Number(e.target.value))))}
          style={{ fontSize: '1.5rem', width: '80px', padding: '0.25rem', textAlign: 'center' }}
        />
      </div>

      <p style={{ fontSize: '1.25rem' }}>
        Total: <strong>€{total}</strong>
      </p>

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          background: loading ? '#93c5fd' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
          marginTop: '0.5rem',
        }}
      >
        {loading ? 'Connecting to bank...' : `Pay €${total}`}
      </button>

      {/* Auto-submitted to Redsys TPV once params arrive */}
      {redsysParams && (
        <form ref={formRef} method="POST" action={redsysParams.tpvUrl} style={{ display: 'none' }}>
          <input name="Ds_SignatureVersion" defaultValue={redsysParams.Ds_SignatureVersion} />
          <input name="Ds_MerchantParameters" defaultValue={redsysParams.Ds_MerchantParameters} />
          <input name="Ds_Signature" defaultValue={redsysParams.Ds_Signature} />
        </form>
      )}
    </main>
  )
}
