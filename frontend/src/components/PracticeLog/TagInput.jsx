import { useState } from 'react'

export default function TagInput({ value = [], onChange, placeholder, suggestions = [], minInputLength = 0 }) {
  const [inputVal, setInputVal] = useState('')

  function addTag(tag) {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed)) { setInputVal(''); return }
    onChange([...value, trimmed])
    setInputVal('')
  }

  function removeTag(tag) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  function handleBlur() {
    if (inputVal.trim()) addTag(inputVal)
  }

  const visibleSuggestions = inputVal.length >= minInputLength
    ? suggestions.filter(s =>
        !value.includes(s) &&
        (inputVal === '' || s.toLowerCase().includes(inputVal.toLowerCase()))
      )
    : []

  return (
    <div>
      <div style={containerStyle}>
        {value.map(tag => (
          <span key={tag} style={tagStyle}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} style={removeStyle}>×</button>
          </span>
        ))}
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : undefined}
          style={inputStyle}
        />
      </div>
      {visibleSuggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {visibleSuggestions.map(s => (
            <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => addTag(s)} style={chipStyle}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const containerStyle = {
  display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
  padding: '0.375rem', border: '1px solid #ccc', borderRadius: 4, minHeight: 38,
  background: 'white',
}
const tagStyle = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: '#e8f0fe', color: '#1a56db', borderRadius: 3,
  padding: '0.1rem 0.4rem', fontSize: '0.875rem',
}
const removeStyle = {
  background: 'none', border: 'none', padding: 0, lineHeight: 1,
  cursor: 'pointer', color: '#1a56db', fontSize: '1rem',
}
const inputStyle = {
  border: 'none', outline: 'none', flex: 1, minWidth: 80,
  fontSize: '1rem', padding: '0.1rem', background: 'transparent',
}
const chipStyle = {
  padding: '0.15rem 0.5rem', border: '1px solid #ddd', borderRadius: 12,
  background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: '#555',
}
