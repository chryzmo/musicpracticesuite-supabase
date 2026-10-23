// Semitone offset from C for each note name (including enharmonics)
const NOTE_SEMITONE = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// Notes in each major key (enharmonic spellings chosen for clarity)
const KEY_SCALE = {
  C:  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G:  ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
  D:  ['C#', 'D', 'E', 'F#', 'G', 'A', 'B'],
  A:  ['C#', 'D', 'E', 'F#', 'G#', 'A', 'B'],
  E:  ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
  B:  ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'],
  F:  ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'],
  Bb: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
  Eb: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  Ab: ['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  Db: ['C', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb'],
};

// Clef for each instrument
const INSTRUMENT_CLEF = {
  clarinet:     'treble',
  flute:        'treble',
  bass_clarinet:'treble',
  trumpet:      'treble',
  violin:       'treble',
  viola:        'alto',
  cello:        'bass',
  double_bass:  'bass',
  oboe:         'treble',
  bassoon:      'bass',
};

// Practical sight-reading ranges: [lowNote, lowOctave, highNote, highOctave]
const INSTRUMENT_RANGE = {
  clarinet:     ['A', 3, 'G', 6],
  flute:        ['D', 4, 'A', 6],
  bass_clarinet:['A', 2, 'G', 4],
  trumpet:      ['G', 3, 'A', 5],
  violin:       ['G', 3, 'B', 5],
  viola:        ['C', 3, 'G', 5],
  cello:        ['C', 2, 'E', 5],
  double_bass:  ['E', 1, 'D', 3],
  oboe:         ['Bb', 3, 'G', 5],
  bassoon:      ['Bb', 1, 'G', 4],
};

// Ticks per bar in sixteenth-note units
const TICKS_PER_BAR = { '4/4': 16, '3/4': 12, '6/8': 12, '2/2': 16 };

// Duration name → VexFlow duration string and tick count
const NOTE_META = {
  whole:     { dur: 'w',  ticks: 16 },
  half:      { dur: 'h',  ticks: 8  },
  quarter:   { dur: 'q',  ticks: 4  },
  eighth:    { dur: '8',  ticks: 2  },
  sixteenth: { dur: '16', ticks: 1  },
};

function noteToSemitone(note, octave) {
  return (octave + 1) * 12 + (NOTE_SEMITONE[note] ?? 0);
}

function buildPitchList(keyNotes, lowNote, lowOct, highNote, highOct) {
  const low = noteToSemitone(lowNote, lowOct);
  const high = noteToSemitone(highNote, highOct);
  const result = [];

  for (let oct = lowOct - 1; oct <= highOct + 1; oct++) {
    for (const note of keyNotes) {
      const s = noteToSemitone(note, oct);
      if (s >= low && s <= high) {
        result.push({ note, octave: oct, semitone: s });
      }
    }
  }

  return result.sort((a, b) => a.semitone - b.semitone);
}

function fillBar(totalTicks, noteValues) {
  const avail = (noteValues.length > 0 ? noteValues : ['quarter'])
    .map(nv => NOTE_META[nv])
    .filter(Boolean);

  const result = [];
  let rem = totalTicks;
  let safety = 0;

  while (rem > 0 && safety++ < 128) {
    const fits = avail.filter(nv => nv.ticks <= rem);

    if (fits.length === 0) {
      // Fall back to smallest available subdivision or hard-coded eighth note
      const smallest = avail.reduce((a, b) => a.ticks < b.ticks ? a : b, { ticks: Infinity });
      if (smallest.ticks <= rem) {
        result.push(smallest.dur);
        rem -= smallest.ticks;
      } else {
        // Last resort: fill with individual sixteenth notes
        result.push('16');
        rem -= 1;
      }
      continue;
    }

    const pick = fits[Math.floor(Math.random() * fits.length)];
    result.push(pick.dur);
    rem -= pick.ticks;
  }

  return result;
}

function pickNext(pitches, idx) {
  const r = Math.random();
  let delta;

  if (r < 0.85) {
    // Stepwise: 1-2 scale degrees
    delta = (Math.floor(Math.random() * 2) + 1) * (Math.random() < 0.5 ? 1 : -1);
  } else {
    // Jump: 3-5 scale degrees
    delta = (Math.floor(Math.random() * 3) + 3) * (Math.random() < 0.5 ? 1 : -1);
  }

  let next = idx + delta;

  // Reflect off edges so the melody doesn't get stuck
  if (next < 0) next = Math.abs(next);
  if (next >= pitches.length) next = 2 * (pitches.length - 1) - next;
  next = Math.max(0, Math.min(pitches.length - 1, next));

  return { index: next, pitch: pitches[next] };
}

export function generateMelody({ keySignature, timeSignature, instrument, noteValues }) {
  const key = KEY_SCALE[keySignature] || KEY_SCALE.C;
  const range = INSTRUMENT_RANGE[instrument] || INSTRUMENT_RANGE.clarinet;
  const clef = INSTRUMENT_CLEF[instrument] || 'treble';
  const ticksPerBar = TICKS_PER_BAR[timeSignature] || 16;

  const allPitches = buildPitchList(key, range[0], range[1], range[2], range[3]);
  if (allPitches.length === 0) {
    throw new Error(`No pitches for ${instrument} in ${keySignature}`);
  }

  // Restrict to middle 60% of the range for readable sight-reading exercises
  const lo = Math.floor(allPitches.length * 0.2);
  const hi = Math.ceil(allPitches.length * 0.8);
  const practical = allPitches.slice(lo, hi);

  let pitchIdx = Math.floor(practical.length / 2);
  const bars = [];

  for (let b = 0; b < 4; b++) {
    const durations = fillBar(ticksPerBar, noteValues);
    const notes = durations.map(duration => {
      const { index, pitch } = pickNext(practical, pitchIdx);
      pitchIdx = index;
      return { pitch: `${pitch.note}${pitch.octave}`, duration };
    });
    bars.push(notes);
  }

  return { bars, keySignature, timeSignature, clef };
}
