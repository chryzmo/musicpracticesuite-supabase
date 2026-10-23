import { supabase } from '../lib/supabase'
import { generateMelody } from '../lib/musicGen'
import { toSnake, unwrap } from './mapping'

const VALID_KEYS = new Set(['C','G','D','A','E','B','F','Bb','Eb','Ab','Db'])
const VALID_TIME = new Set(['4/4','3/4','6/8','2/2'])
const VALID_INSTRUMENTS = new Set([
  'clarinet','flute','bass_clarinet','trumpet','violin',
  'viola','cello','double_bass','oboe','bassoon',
])

export const sightReadingApi = {
  // Runs locally; async so callers can keep using it as a mutation
  generate: async ({ keySignature, timeSignature, instrument, noteValues }) => {
    if (!VALID_KEYS.has(keySignature)) throw new Error('Invalid keySignature')
    if (!VALID_TIME.has(timeSignature)) throw new Error('Invalid timeSignature')
    if (!VALID_INSTRUMENTS.has(instrument)) throw new Error('Invalid instrument')

    return generateMelody({
      keySignature,
      timeSignature,
      instrument,
      noteValues: Array.isArray(noteValues) && noteValues.length > 0 ? noteValues : ['quarter'],
    })
  },

  logSession: async ({ keySignature, timeSignature, instrument, noteValues, selfRating, notes }) =>
    unwrap(await supabase.from('sight_reading_sessions')
      .insert(toSnake({
        keySignature: keySignature || 'C',
        timeSignature: timeSignature || '4/4',
        instrument: instrument || 'clarinet',
        noteValues: Array.isArray(noteValues) ? noteValues : [],
        selfRating: selfRating ? Number(selfRating) : null,
        notes: notes || null,
      }))
      .select()
      .single()),
}
