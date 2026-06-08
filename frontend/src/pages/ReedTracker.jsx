import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reedApi } from '../api/reeds'
import AddReedModal from '../components/ReedTracker/AddReedModal'

function formatUsageTime(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function NotesCell({ reed, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(reed.notes || '')

  function handleBlur() {
    setEditing(false)
    if (value !== (reed.notes || '')) onSave(reed.id, value)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        style={{ width: '100%', padding: '0.25rem', border: '1px solid #0066cc', borderRadius: 3 }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: 'text', display: 'block', minWidth: 80, color: value ? 'inherit' : '#aaa' }}
    >
      {value || 'add note…'}
    </span>
  )
}

export default function ReedTracker() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: reeds = [], isLoading, isError } = useQuery({
    queryKey: ['reeds'],
    queryFn: reedApi.listActive,
  })

  const retireMutation = useMutation({
    mutationFn: reedApi.retire,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reeds'] }),
  })

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => reedApi.update(id, { notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reeds'] }),
  })

  function handleRetire(reed) {
    if (window.confirm(`Retire "${reed.identifier}"?`)) {
      retireMutation.mutate(reed.id)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Reed Tracker</h1>
        <button onClick={() => setShowModal(true)} style={{ background: '#0066cc', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: 4 }}>
          + Add Reed
        </button>
      </div>

      {isLoading && <p>Loading…</p>}
      {isError && <p style={{ color: '#c00' }}>Failed to load reeds.</p>}

      {!isLoading && !isError && reeds.length === 0 && (
        <p style={{ color: '#666' }}>No active reeds. Add one to get started.</p>
      )}

      {reeds.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                {['Identifier', 'Type', 'Open Date', 'Usage Time', 'Notes', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reeds.map(reed => (
                <tr key={reed.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}><strong>{reed.identifier}</strong></td>
                  <td style={tdStyle}>{reed.reedType}</td>
                  <td style={tdStyle}>{formatDate(reed.openDate)}</td>
                  <td style={{ ...tdStyle, color: reed.usageMinutes >= 1200 ? '#c00' : 'inherit' }}>
                    {formatUsageTime(reed.usageMinutes)}
                    {reed.usageMinutes >= 1200 && <span title="Consider retiring"> ⚠</span>}
                  </td>
                  <td style={{ ...tdStyle, minWidth: 140 }}>
                    <NotesCell
                      reed={reed}
                      onSave={(id, notes) => updateNotesMutation.mutate({ id, notes })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleRetire(reed)}
                      disabled={retireMutation.isPending}
                      style={{ fontSize: '0.85rem' }}
                    >
                      Retire
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddReedModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['reeds'] })
          }}
        />
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, borderBottom: '2px solid #ddd' }
const tdStyle = { padding: '0.625rem 0.75rem', verticalAlign: 'middle' }
