import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PracticeLog from './pages/PracticeLog'
import SightReading from './pages/SightReading'
import ReedTracker from './pages/ReedTracker'

function Layout() {
  const { session, loading, logout } = useAuth()

  if (loading) return null
  if (!session) return <Login />

  return (
    <>
      <nav style={navStyle}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <NavLink to="/" end style={navLinkStyle}>Dashboard</NavLink>
          <NavLink to="/practice" style={navLinkStyle}>Practice Log</NavLink>
          <NavLink to="/sight-reading" style={navLinkStyle}>Sight Reading</NavLink>
          <NavLink to="/reeds" style={navLinkStyle}>Reed Tracker</NavLink>
        </div>
        <button onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
      </nav>
      <main style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<PracticeLog />} />
          <Route path="/sight-reading" element={<SightReading />} />
          <Route path="/reeds" element={<ReedTracker />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}

const navStyle = {
  padding: '0.75rem 1.5rem', borderBottom: '1px solid #ddd',
  display: 'flex', alignItems: 'center', gap: '1rem',
}
const navLinkStyle = ({ isActive }) => ({
  color: isActive ? '#0044aa' : '#0066cc',
  fontWeight: isActive ? 600 : 400,
})
