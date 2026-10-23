import { supabase } from '../lib/supabase'
import { toCamel, toSnake, unwrap } from './mapping'

// Row-level security limits every query to the signed-in user's sessions
const sessions = () => supabase.from('practice_sessions')
const WITH_REED = '*, reed:reeds(identifier, reed_type)'

// PostgREST caps responses at 1000 rows, so page through when we need every session
async function fetchAllSessions(columns) {
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sessions()
      .select(columns)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return toCamel(rows)
  }
}

function topCounts(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function tally(counts, items) {
  for (const item of items) counts[item] = (counts[item] || 0) + 1
}

export const practiceApi = {
  list: async ({ limit = 20, offset = 0 } = {}) => {
    limit = Math.min(limit, 100)
    const { data, error, count } = await sessions()
      .select(WITH_REED, { count: 'exact' })
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return { sessions: toCamel(data), total: count, limit, offset }
  },

  // Computed in the browser so weeks, months and streaks follow the user's local time
  summary: async () => {
    const allSessions = await fetchAllSessions('date, duration_minutes, pieces, skills')

    const now = new Date()
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalMinutesAllTime = 0
    let totalMinutesThisWeek = 0
    let totalMinutesThisMonth = 0
    const pieceCounts = {}
    const skillCounts = {}
    const skillCountsThisMonth = {}
    const practicedDays = new Set()

    for (const s of allSessions) {
      const date = new Date(s.date)
      totalMinutesAllTime += s.durationMinutes
      if (date >= weekStart) totalMinutesThisWeek += s.durationMinutes
      if (date >= monthStart) {
        totalMinutesThisMonth += s.durationMinutes
        tally(skillCountsThisMonth, s.skills)
      }
      tally(pieceCounts, s.pieces)
      tally(skillCounts, s.skills)
      practicedDays.add(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime())
    }

    // Streak: consecutive days with at least one session, ending today
    let streak = 0
    const check = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    while (practicedDays.has(check.getTime())) {
      streak++
      check.setDate(check.getDate() - 1)
    }

    return {
      totalMinutesAllTime,
      totalSessionsAllTime: allSessions.length,
      totalMinutesThisWeek,
      totalMinutesThisMonth,
      topPieces: topCounts(pieceCounts).slice(0, 5).map(([name, count]) => ({ name, count })),
      topSkills: topCounts(skillCounts).slice(0, 5).map(([name, count]) => ({ name, count })),
      topSkillThisMonth: topCounts(skillCountsThisMonth)[0]?.[0] ?? null,
      streak,
    }
  },

  insights: async () => {
    const { data, error } = await supabase.functions.invoke('insights')
    if (error) throw error
    return data
  },

  // Distinct pieces, most recently practiced first
  pieces: async () => {
    const rows = await fetchAllSessions('pieces')
    return [...new Set(rows.flatMap(s => s.pieces))]
  },

  create: async ({ durationMinutes, pieces = [], skills = [], notes, reedId }) =>
    unwrap(await sessions()
      .insert(toSnake({
        durationMinutes: Number(durationMinutes),
        pieces,
        skills,
        notes: notes || null,
        reedId: reedId || null,
      }))
      .select(WITH_REED)
      .single()),

  remove: async (id) => {
    const { error } = await sessions().delete().eq('id', id)
    if (error) throw error
  },
}
