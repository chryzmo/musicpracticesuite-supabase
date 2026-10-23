// AI practice insights for the signed-in user.
// Reads the caller's recent sessions through RLS, caches results for 24h in insights_cache.

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const InsightsSchema = z.object({
  strengths: z.array(z.string()).describe('2 to 3 specific strengths visible in the data'),
  focusAreas: z.array(z.string()).describe('2 to 3 areas that are underrepresented or missing from recent practice'),
  recommendations: z.array(z.string()).describe('3 specific, actionable things to prioritize this week'),
  patterns: z.string().describe('1-2 sentences about notable patterns in frequency, duration, or consistency'),
})

const FALLBACK = {
  strengths: ['Regular practice sessions maintained'],
  focusAreas: ['Analysis unavailable — try refreshing'],
  recommendations: ['Continue logging sessions for richer insights'],
  patterns: 'Could not generate a structured response.',
}

const anthropic = new Anthropic()

type Session = { date: string; duration_minutes: number; pieces: string[]; skills: string[] }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Client that acts as the caller, so RLS scopes every query to their rows
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: claims, error: authError } = await supabase.auth.getClaims(authHeader.replace(/^Bearer /, ''))
  if (authError || !claims) return json({ error: 'Invalid or expired token' }, 401)
  const userId = claims.claims.sub

  try {
    return json(await generateInsights(supabase, userId))
  } catch (err) {
    console.error(err)
    return json({ error: 'Failed to generate insights' }, 500)
  }
})

async function generateInsights(supabase: SupabaseClient, userId: string) {
  const { data: cached } = await supabase
    .from('insights_cache')
    .select('data')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (cached) return cached.data

  const { data: sessions, error } = await supabase
    .from('practice_sessions')
    .select('date, duration_minutes, pieces, skills')
    .order('date', { ascending: false })
    .limit(30)
  if (error) throw error

  if (sessions.length < 5) {
    return { insufficient: true, sessionCount: sessions.length }
  }

  const message = await anthropic.messages.parse({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(buildSummary(sessions)) }],
    output_config: { format: zodOutputFormat(InsightsSchema) },
  })

  const result = {
    ...(message.parsed_output ?? FALLBACK),
    generatedAt: new Date().toISOString(),
    sessionCount: sessions.length,
  }

  // Only cache real answers, so a refresh can recover from a failed one
  if (message.parsed_output) {
    const { error: cacheError } = await supabase.from('insights_cache').upsert({
      user_id: userId,
      data: result,
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    })
    if (cacheError) console.error('Failed to cache insights:', cacheError)
  }

  return result
}

function buildSummary(sessions: Session[]) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)

  const pieceCounts: Record<string, number> = {}
  const skillCounts: Record<string, number> = {}
  for (const s of sessions) {
    for (const p of s.pieces) pieceCounts[p] = (pieceCounts[p] || 0) + 1
    for (const sk of s.skills) skillCounts[sk] = (skillCounts[sk] || 0) + 1
  }

  const topPieces = Object.entries(pieceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} sessions)`)

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${Math.round((count / sessions.length) * 100)}% of sessions)`)

  const weekCounts: Record<string, number> = {}
  for (const s of sessions) {
    const d = new Date(s.date)
    const weekKey = `${d.getFullYear()}-W${getISOWeek(d)}`
    weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1
  }
  const weeks = Object.keys(weekCounts).length
  const avgPerWeek = weeks > 0
    ? (sessions.length / weeks).toFixed(1)
    : sessions.length.toString()

  const oldest = new Date(sessions[sessions.length - 1].date).toLocaleDateString()
  const newest = new Date(sessions[0].date).toLocaleDateString()

  return {
    sessionCount: sessions.length,
    dateRange: `${oldest} to ${newest}`,
    totalHours: (totalMinutes / 60).toFixed(1),
    avgDuration: Math.round(totalMinutes / sessions.length),
    avgPerWeek,
    topPieces,
    topSkills,
  }
}

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function buildPrompt(s: ReturnType<typeof buildSummary>) {
  return `You are a music practice coach analyzing a musician's recent practice data. Provide concise, specific insights.

Practice data (last ${s.sessionCount} sessions, ${s.dateRange}):
- Total practice time: ${s.totalHours} hours
- Average session: ${s.avgDuration} minutes
- Average sessions per week: ${s.avgPerWeek}
- Pieces worked on: ${s.topPieces.length > 0 ? s.topPieces.join('; ') : 'none logged'}
- Skills practiced: ${s.topSkills.length > 0 ? s.topSkills.join('; ') : 'none logged'}

Give 2 to 3 strengths visible in the data, 2 to 3 focus areas that are underrepresented or missing from recent practice, 3 specific actionable recommendations for this week, and 1-2 sentences on notable patterns in frequency, duration, or consistency.`
}
