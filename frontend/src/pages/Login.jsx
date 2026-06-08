import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleDevLogin() {
    setLoading(true)
    setError(null)
    try {
      const res = await client.post('/api/dev/token', { email: 'dev@example.com' })
      login(res.data.token)
    } catch {
      setError('Login failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Musician Practice Suite</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Development login — not for production use.</p>
        {error && <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>}
        <button onClick={handleDevLogin} disabled={loading} style={btnStyle}>
          {loading ? 'Signing in…' : 'Dev Login'}
        </button>
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
