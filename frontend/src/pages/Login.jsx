import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'google', label: 'Continue with Google' },
]

export default function Login() {
  const { signIn } = useAuth()
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)

  async function handleSignIn(provider) {
    setPending(provider)
    setError(null)
    // On success the browser leaves for the provider, so only failures land here
    const { error } = await signIn(provider)
    if (error) {
      setError(error.message)
      setPending(null)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Musician Practice Suite</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Sign in to track your practice.</p>
        {error && <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => handleSignIn(p.id)} disabled={pending !== null} style={btnStyle}>
              {pending === p.id ? 'Redirecting…' : p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5',
}
const cardStyle = {
  background: 'white', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 360,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
}
const btnStyle = {
  width: '100%', padding: '0.75rem', fontSize: '1rem', background: '#0066cc', color: 'white',
  border: 'none', borderRadius: 4, cursor: 'pointer',
}
