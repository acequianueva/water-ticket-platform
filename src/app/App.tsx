import { useEffect, useState } from 'react'

export default function App() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hello')
      .then((r) => r.json())
      .then((data) => setMessage((data as { message: string }).message))
      .catch(() => setMessage('Error al cargar el saludo'))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Acequia Nueva Pozo Site</h1>
      <p data-testid="greeting">{message ?? 'Cargando...'}</p>
    </main>
  )
}
