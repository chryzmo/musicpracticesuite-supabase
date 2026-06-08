const prisma = require('../db/prisma');
const { generateMelody } = require('../services/musicGen');

const VALID_KEYS = new Set(['C','G','D','A','E','B','F','Bb','Eb','Ab','Db']);
const VALID_TIME = new Set(['4/4','3/4','6/8','2/2']);
const VALID_INSTRUMENTS = new Set([
  'clarinet','flute','bass_clarinet','trumpet','violin',
  'viola','cello','double_bass','oboe','bassoon',
]);

async function generate(req, res) {
  const { keySignature, timeSignature, instrument, noteValues } = req.body;

  if (!VALID_KEYS.has(keySignature)) {
    return res.status(400).json({ error: 'Invalid keySignature' });
  }
  if (!VALID_TIME.has(timeSignature)) {
    return res.status(400).json({ error: 'Invalid timeSignature' });
  }
  if (!VALID_INSTRUMENTS.has(instrument)) {
    return res.status(400).json({ error: 'Invalid instrument' });
  }

  const melody = generateMelody({
    keySignature,
    timeSignature,
    instrument,
    noteValues: Array.isArray(noteValues) && noteValues.length > 0 ? noteValues : ['quarter'],
  });

  res.json(melody);
}

async function logSession(req, res) {
  const { keySignature, timeSignature, instrument, noteValues, selfRating, notes } = req.body;

  const session = await prisma.sightReadingSession.create({
    data: {
      userId: req.user.id,
      keySignature: keySignature || 'C',
      timeSignature: timeSignature || '4/4',
      instrument: instrument || 'clarinet',
      noteValues: Array.isArray(noteValues) ? noteValues : [],
      selfRating: selfRating ? Number(selfRating) : null,
      notes: notes || null,
    },
  });

  res.status(201).json(session);
}

module.exports = { generate, logSession };
