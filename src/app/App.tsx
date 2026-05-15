import BuyPage from './BuyPage'
import ConfirmacionPage from './ConfirmacionPage'

export default function App() {
  const path = window.location.pathname
  const search = new URLSearchParams(window.location.search)

  if (path === '/confirmacion') return <ConfirmacionPage />
  return <BuyPage error={search.get('error') ?? undefined} />
}
