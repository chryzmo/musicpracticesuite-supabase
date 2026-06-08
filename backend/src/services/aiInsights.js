const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../db/prisma');

const client = new Anthropic();
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function generateInsights(userId) {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const sessions = await prisma.practiceSession.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
    select: { date: true, durationMinutes: true, pieces: true, skills: true },
  });

  if (sessions.length < 5) {
    return { insufficient: true, sessionCount: sessions.length };
  }

  const summary = buildSummary(sessions);
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(summary) }],
  });

  const result = {
    ...parseResponse(message.content[0].text),
    generatedAt: new Date().toISOString(),
    sessionCount: sessions.length,
  };

  cache.set(userId, { data: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

function buildSummary(sessions) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const pieceCounts = {};
  const skillCounts = {};
  for (const s of sessions) {
    for (const p of s.pieces) pieceCounts[p] = (pieceCounts[p] || 0) + 1;
    for (const sk of s.skills) skillCounts[sk] = (skillCounts[sk] || 0) + 1;
  }

  const topPieces = Object.entries(pieceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} sessions)`);

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${Math.round((count / sessions.length) * 100)}% of sessions)`);

  const weekCounts = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const weekKey = `${d.getFullYear()}-W${getISOWeek(d)}`;
    weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
  }
  const weeks = Object.keys(weekCounts).length;
  const avgPerWeek = weeks > 0
    ? (sessions.length / weeks).toFixed(1)
    : sessions.length.toString();

  const oldest = new Date(sessions[sessions.length - 1].date).toLocaleDateString();
  const newest = new Date(sessions[0].date).toLocaleDateString();

  return {
    sessionCount: sessions.length,
    dateRange: `${oldest} to ${newest}`,
    totalHours: (totalMinutes / 60).toFixed(1),
    avgDuration: Math.round(totalMinutes / sessions.length),
    avgPerWeek,
    topPieces,
    topSkills,
  };
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildPrompt(s) {
  return `You are a music practice coach analyzing a musician's recent practice data. Provide concise, specific insights.

Practice data (last ${s.sessionCount} sessions, ${s.dateRange}):
- Total practice time: ${s.totalHours} hours
- Average session: ${s.avgDuration} minutes
- Average sessions per week: ${s.avgPerWeek}
- Pieces worked on: ${s.topPieces.length > 0 ? s.topPieces.join('; ') : 'none logged'}
- Skills practiced: ${s.topSkills.length > 0 ? s.topSkills.join('; ') : 'none logged'}

Respond with ONLY valid JSON — no markdown fences, no text outside the object:
{
  "strengths": ["2 to 3 specific strengths visible in the data"],
  "focusAreas": ["2 to 3 areas that are underrepresented or missing from recent practice"],
  "recommendations": ["3 specific, actionable things to prioritize this week"],
  "patterns": "1-2 sentences about notable patterns in frequency, duration, or consistency"
}`;
}

function parseResponse(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}

  return {
    strengths: ['Regular practice sessions maintained'],
    focusAreas: ['Analysis unavailable — try refreshing'],
    recommendations: ['Continue logging sessions for richer insights'],
    patterns: 'Could not parse structured response.',
  };
}

function clearCache(userId) {
  cache.delete(userId);
}

module.exports = { generateInsights, clearCache };
