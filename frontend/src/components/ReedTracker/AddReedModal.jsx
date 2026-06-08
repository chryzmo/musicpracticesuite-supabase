import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reedApi } from '../../api/reeds'

export default function AddReedModal({ onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ identifier: '', reedType: '', openDate: today, notes: '' })

  const mutation = useMutation({ mutationFn: reedApi.create, onSuccess })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>Add Reed</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <Field label="Identifier">
            <input name="identifier" value={form.identifier} onChange={handleChange} required style={inputStyle} placeholder="e.g. Reed #1" />
          </Field>
          <Field label="Reed Type">
            <input name="reedType" value={form.reedType} onChange={handleChange} required style={inputStyle} placeholder="e.g. Vandoren V12 3.5" />
          </Field>
          <Field label="Open Date">
            <input type="date" name="openDate" value={form.openDate} onChange={handleChange} required style={inputStyle} />
          </Field>
          <Field label="Notes">
            <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...inputStyle, height: 72, resize: 'vertical' }} placeholder="Optional…" />
          </Field>
          {mutation.isError && <p style={{ color: '#c00', margin: '0 0 0.75rem' }}>Error saving reed — try again.</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{ background: '#0066cc', color: 'white', border: 'none' }}>
              {mutation.isPending ? 'Saving…' : 'Add Reed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</label>
      {children}
    </div>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle = {
  background: 'white', borderRadius: 8, padding: '1.5rem',
  width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
}
const inputStyle = {
  padding: '0.5rem 0.625rem', border: '1px solid #ccc', borderRadius: 4,
  fontSize: '1rem', width: '100%', boxSizing: 'border-box',
}
