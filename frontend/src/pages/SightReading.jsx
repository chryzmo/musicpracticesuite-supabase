import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Renderer, Stave, StaveNote, Voice, Formatter, Beam,
  Accidental, RendererBackends, VoiceMode,
} from 'vexflow'
import { sightReadingApi } from '../api/sightReading'

const KEY_OPTIONS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db']
const TIME_OPTIONS = ['4/4', '3/4', '6/8', '2/2']
const INSTRUMENT_OPTIONS = [
  { value: 'clarinet',     label: 'Clarinet' },
  { value: 'flute',        label: 'Flute' },
  { value: 'bass_clarinet',label: 'Bass Clarinet' },
  { value: 'trumpet',      label: 'Trumpet' },
  { value: 'violin',       label: 'Violin' },
  { value: 'viola',        label: 'Viola' },
  { value: 'cello',        label: 'Cello' },
  { value: 'double_bass',  label: 'Double Bass' },
  { value: 'oboe',         label: 'Oboe' },
  { value: 'bassoon',      label: 'Bassoon' },
]
const NOTE_VALUE_OPTIONS = [
  { value: 'whole',     label: 'Whole' },
  { value: 'half',      label: 'Half' },
  { value: 'quarter',   label: 'Quarter' },
  { value: 'eighth',    label: 'Eighth' },
  { value: 'sixteenth', label: 'Sixteenth' },
]

const DEFAULTS = {
  keySignature: 'C',
  timeSignature: '4/4',
  instrument: 'clarinet',
  noteValues: ['quarter', 'half'],
}

export default function SightReading() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [melody, setMelody] = useState(null)
  const [rating, setRating] = useState(0)
  const [sessionNotes, setSessionNotes] = useState('')
  const [logged, setLogged] = useState(false)
  const containerRef = useRef(null)

  const generateMutation = useMutation({
    mutationFn: sightReadingApi.generate,
    onSuccess: (data) => {
      setMelody(data)
      setRating(0)
      setSessionNotes('')
      setLogged(false)
    },
  })

  const logMutation = useMutation({
    mutationFn: sightReadingApi.logSession,
    onSuccess: () => setLogged(true),
  })

  useEffect(() => {
    if (melody && containerRef.current) {
      try {
        renderMelody(containerRef.current, melody)
      } catch (err) {
        console.error('VexFlow render error:', err)
      }
    }
  }, [melody])

  function handleGenerate() {
    if (settings.noteValues.length === 0) return
    generateMutation.mutate(settings)
  }

  function handleLog() {
    logMutation.mutate({
      ...settings,
      selfRating: rating || undefined,
      notes: sessionNotes || undefined,
    })
  }

  function toggleNoteValue(v) {
    setSettings(s => ({
      ...s,
      noteValues: s.noteValues.includes(v)
        ? s.noteValues.filter(nv => nv !== v)
        : [...s.noteValues, v],
    }))
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Sight-Reading Trainer</h1>

      {/* SECTION 1 — Controls */}
      <section style={panelStyle}>
        <h2 style={headStyle}>Settings</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>

          <ControlField label="Key">
            <select
              value={settings.keySignature}
              onChange={e => setSettings(s => ({ ...s, keySignature: e.target.value }))}
              style={selectStyle}
            >
              {KEY_OPTIONS.map(k => <option key={k} value={k}>{k} major</option>)}
            </select>
          </ControlField>

          <ControlField label="Time">
            <select
              value={settings.timeSignature}
              onChange={e => setSettings(s => ({ ...s, timeSignature: e.target.value }))}
              style={selectStyle}
            >
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </ControlField>

          <ControlField label="Instrument">
            <select
              value={settings.instrument}
              onChange={e => setSettings(s => ({ ...s, instrument: e.target.value }))}
              style={selectStyle}
            >
              {INSTRUMENT_OPTIONS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </ControlField>

          <ControlField label="Note Values">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {NOTE_VALUE_OPTIONS.map(nv => (
                <label
                  key={nv.value}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.noteValues.includes(nv.value)}
                    onChange={() => toggleNoteValue(nv.value)}
                  />
                  {nv.label}
                </label>
              ))}
            </div>
          </ControlField>

          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || settings.noteValues.length === 0}
            style={primaryBtn}
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate Music'}
          </button>
        </div>

        {settings.noteValues.length === 0 && (
          <p style={{ margin: '0.625rem 0 0', fontSize: '0.85rem', color: '#c00' }}>
            Select at least one note value.
          </p>
        )}
        {generateMutation.isError && (
          <p style={{ margin: '0.625rem 0 0', fontSize: '0.85rem', color: '#c00' }}>
            Generation failed — try again.
          </p>
        )}
      </section>

      {/* SECTION 2 — Music Display */}
      {melody && (
        <section style={{ ...panelStyle, marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ ...headStyle, margin: 0 }}>
              {melody.keySignature} major &middot; {melody.timeSignature}
              <span style={{ fontWeight: 400, color: '#888', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                ({INSTRUMENT_OPTIONS.find(i => i.value === settings.instrument)?.label})
              </span>
            </h2>
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              style={{ fontSize: '0.85rem', color: '#555' }}
            >
              ↺ New passage
            </button>
          </div>
          <div
            ref={containerRef}
            style={{ width: '100%', overflowX: 'auto', background: 'white', borderRadius: 4, minHeight: 100 }}
          />
        </section>
      )}

      {/* SECTION 3 — After practicing */}
      {melody && !logged && (
        <section style={{ ...panelStyle, marginTop: '1rem' }}>
          <h2 style={headStyle}>How did that go?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={{ display: 'block', ...labelStyle, marginBottom: '0.375rem' }}>
                Self-rating
              </label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <label style={{ display: 'block', ...labelStyle, marginBottom: '0.375rem' }}>
                Notes (optional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="How did the sight-reading feel? Any trouble spots?"
                style={{ width: '100%', maxWidth: 480, padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem', height: 64, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleLog}
                disabled={logMutation.isPending}
                style={primaryBtn}
              >
                {logMutation.isPending ? 'Saving…' : 'Log This Session'}
              </button>
              <button onClick={handleGenerate} disabled={generateMutation.isPending}>
                Generate New
              </button>
            </div>
            {logMutation.isError && (
              <p style={{ color: '#c00', fontSize: '0.875rem', margin: 0 }}>
                Failed to save — try again.
              </p>
            )}
          </div>
        </section>
      )}

      {logged && (
        <section style={{ ...panelStyle, marginTop: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p style={{ margin: '0 0 0.75rem', color: '#166534', fontWeight: 500 }}>
            Session logged!
          </p>
          <button onClick={handleGenerate} style={primaryBtn}>
            Generate New Passage
          </button>
        </section>
      )}
    </div>
  )
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          style={{
            background: 'none', border: 'none', padding: '2px 3px',
            fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1,
            color: n <= value ? '#f59e0b' : '#d1d5db',
          }}
          title={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  )
}

function ControlField({ label, children }) {
  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: '0.3rem' }}>{label}</div>
      {children}
    </div>
  )
}

// --- VexFlow rendering ---

function pitchToVexKey(pitch) {
  const m = pitch.match(/^([A-G][b#]?)(\d+)$/)
  if (!m) return 'b/4'
  return `${m[1].toLowerCase()}/${m[2]}`
}

function renderMelody(container, melody) {
  container.innerHTML = ''

  const width = Math.max(container.clientWidth || 0, 640)
  const BARS_PER_ROW = 2
  const ROW_HEIGHT = 150
  const H_MARGIN = 12
  const V_START = 40

  const numRows = Math.ceil(melody.bars.length / BARS_PER_ROW)
  const totalHeight = V_START + numRows * ROW_HEIGHT + 16
  const barWidth = Math.floor((width - H_MARGIN * (BARS_PER_ROW + 1)) / BARS_PER_ROW)

  const renderer = new Renderer(container, RendererBackends.SVG)
  renderer.resize(width, totalHeight)
  const context = renderer.getContext()

  const clef = melody.clef || 'treble'
  const tsParts = melody.timeSignature.split('/')
  const tsNum = parseInt(tsParts[0], 10)
  const tsDen = parseInt(tsParts[1], 10)

  melody.bars.forEach((bar, i) => {
    const row = Math.floor(i / BARS_PER_ROW)
    const col = i % BARS_PER_ROW
    const x = H_MARGIN + col * (barWidth + H_MARGIN)
    const y = V_START + row * ROW_HEIGHT

    const stave = new Stave(x, y, barWidth)

    if (i === 0) {
      stave.addClef(clef).addKeySignature(melody.keySignature).addTimeSignature(melody.timeSignature)
    } else if (col === 0) {
      stave.addClef(clef).addKeySignature(melody.keySignature)
    }

    stave.setContext(context).draw()

    const staveNotes = bar.map(n => new StaveNote({
      clef,
      keys: [pitchToVexKey(n.pitch)],
      duration: n.duration,
    }))

    const voice = new Voice({ num_beats: tsNum, beat_value: tsDen })
    voice.setMode(VoiceMode.SOFT)
    voice.addTickables(staveNotes)

    Accidental.applyAccidentals([voice], melody.keySignature)

    const noteAreaWidth = barWidth - (stave.getNoteStartX() - stave.getX()) - 8
    new Formatter().joinVoices([voice]).format([voice], noteAreaWidth)

    voice.draw(context, stave)

    const beams = Beam.generateBeams(staveNotes)
    beams.forEach(beam => beam.setContext(context).draw())
  })
}

// --- Styles ---

const panelStyle = {
  background: '#fafafa',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: '1.25rem',
}
const headStyle = {
  margin: '0 0 1rem',
  fontSize: '1.05rem',
  fontWeight: 600,
}
const selectStyle = {
  padding: '0.4rem 0.5rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.9rem',
  background: 'white',
}
const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#444',
}
const primaryBtn = {
  background: '#0066cc',
  color: 'white',
  border: 'none',
  padding: '0.5rem 1.25rem',
  fontSize: '0.95rem',
  borderRadius: 4,
}
