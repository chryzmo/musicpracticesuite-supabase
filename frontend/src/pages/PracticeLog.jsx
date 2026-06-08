import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { practiceApi } from '../api/practice'
import { reedApi } from '../api/reeds'
import TagInput from '../components/PracticeLog/TagInput'

const SKILL_SUGGESTIONS = ['tone', 'technique', 'intonation', 'rhythm', 'articulation', 'excerpts', 'scales', 'etudes']
const PAGE_SIZE = 10
const EMPTY_FORM = { durationMinutes: '', pieces: [], skills: [], reedId: '', notes: '' }

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function PracticeLog() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [showNotes, setShowNotes] = useState(false)
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  const { data: sessionData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['practice', page],
    queryFn: () => practiceApi.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  })

  const { data: reeds = [] } = useQuery({
    queryKey: ['reeds'],
    queryFn: reedApi.listActive,
  })

  const { data: pieceSuggestions = [] } = useQuery({
    queryKey: ['practice-pieces'],
    queryFn: practiceApi.pieces,
  })

  const createMutation = useMutation({
    mutationFn: practiceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice'] })
      queryClient.invalidateQueries({ queryKey: ['practice-pieces'] })
      setForm(EMPTY_FORM)
      setShowNotes(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: practiceApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice'] }),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.durationMinutes || Number(form.durationMinutes) <= 0) return
    createMutation.mutate({
      durationMinutes: Number(form.durationMinutes),
      pieces: form.pieces,
      skills: form.skills,
      reedId: form.reedId || undefined,
      notes: form.notes || undefined,
    })
  }

  const sessions = sessionData?.sessions ?? []
  const total = sessionData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Practice Log</h1>

      {/* SECTION 1 — Quick Log Form */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Log a Session</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          <Field label="Duration (min)">
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              autoFocus
              required
              style={{ ...inputStyle, maxWidth: 120 }}
              placeholder="e.g. 45"
            />
          </Field>

          <Field label="Pieces">
            <TagInput
              value={form.pieces}
              onChange={pieces => setForm(f => ({ ...f, pieces }))}
              placeholder="Type a piece name and press Enter…"
              suggestions={pieceSuggestions}
              minInputLength={1}
            />
          </Field>

          <Field label="Skills">
            <TagInput
              value={form.skills}
              onChange={skills => setForm(f => ({ ...f, skills }))}
              placeholder="Type or click a skill below…"
              suggestions={SKILL_SUGGESTIONS}
            />
          </Field>

          <Field label="Reed">
            <select
              value={form.reedId}
              onChange={e => setForm(f => ({ ...f, reedId: e.target.value }))}
              style={inputStyle}
            >
              <option value="">No reed selected</option>
              {reeds.map(r => (
                <option key={r.id} value={r.id}>{r.identifier} — {r.reedType}</option>
              ))}
            </select>
          </Field>

          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#0066cc', padding: 0, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              + Add notes
            </button>
          ) : (
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                placeholder="Optional…"
              />
            </Field>
          )}

          {createMutation.isError && (
            <p style={{ color: '#c00', margin: 0, fontSize: '0.875rem' }}>Error saving session — try again.</p>
          )}

          <div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ background: '#0066cc', color: 'white', border: 'none', padding: '0.6rem 1.5rem', fontSize: '1rem', borderRadius: 4 }}
            >
              {createMutation.isPending ? 'Saving…' : 'Log Session'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2 — Session History */}
      <section style={{ ...sectionStyle, marginTop: '1.5rem' }}>
        <h2 style={sectionHeadingStyle}>
          Session History{' '}
          {total > 0 && <span style={{ fontWeight: 400, color: '#666', fontSize: '0.9rem' }}>({total} total)</span>}
        </h2>

        {sessionsLoading && <p style={{ color: '#666' }}>Loading…</p>}

        {!sessionsLoading && sessions.length === 0 && (
          <p style={{ color: '#666' }}>No sessions yet. Log your first session above.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={id => {
                if (window.confirm('Delete this session?')) deleteMutation.mutate(id)
              }}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
          </div>
        )}
      </section>
    </div>
  )
}

function SessionCard({ session, onDelete }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{formatDate(session.date)}</span>
          <span style={{ color: '#555' }}>{formatDuration(session.durationMinutes)}</span>
          {session.reed && (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>Reed: {session.reed.identifier}</span>
          )}
        </div>
        <button
          onClick={() => onDelete(session.id)}
          title="Delete session"
          style={{ background: 'none', border: 'none', color: '#bbb', fontSize: '1.2rem', lineHeight: 1, padding: '0 0.125rem', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {session.pieces.length > 0 && (
        <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {session.pieces.map(p => <Chip key={p} label={p} bg="#eff6ff" color="#1d4ed8" />)}
        </div>
      )}

      {session.skills.length > 0 && (
        <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {session.skills.map(s => <Chip key={s} label={s} bg="#f0fdf4" color="#166534" />)}
        </div>
      )}

      {session.notes && (
        <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', color: '#555' }}>{session.notes}</p>
      )}
    </div>
  )
}

function Chip({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, padding: '0.1rem 0.45rem', borderRadius: 3, fontSize: '0.8rem' }}>
      {label}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <label style={{ width: 110, flexShrink: 0, paddingTop: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

const sectionStyle = { background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '1.25rem' }
const sectionHeadingStyle = { margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 600 }
const inputStyle = { padding: '0.5rem 0.625rem', border: '1px solid #ccc', borderRadius: 4, fontSize: '1rem', width: '100%', boxSizing: 'border-box' }
const cardStyle = { padding: '0.75rem 0.875rem', border: '1px solid #e5e7eb', borderRadius: 6, background: 'white' }
