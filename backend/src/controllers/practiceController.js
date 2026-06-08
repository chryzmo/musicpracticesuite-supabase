const prisma = require('../db/prisma');

async function list(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  const [sessions, total] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: { reed: { select: { identifier: true, reedType: true } } },
    }),
    prisma.practiceSession.count({ where: { userId: req.user.id } }),
  ]);

  res.json({ sessions, total, limit, offset });
}

async function summary(req, res) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisWeek, thisMonth, allSessions] = await Promise.all([
    prisma.practiceSession.aggregate({
      where: { userId: req.user.id },
      _sum: { durationMinutes: true },
      _count: true,
    }),
    prisma.practiceSession.aggregate({
      where: { userId: req.user.id, date: { gte: weekStart } },
      _sum: { durationMinutes: true },
    }),
    prisma.practiceSession.aggregate({
      where: { userId: req.user.id, date: { gte: monthStart } },
      _sum: { durationMinutes: true },
    }),
    prisma.practiceSession.findMany({
      where: { userId: req.user.id },
      select: { pieces: true, skills: true, date: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  const pieceCounts = {};
  const skillCounts = {};
  const skillCountsThisMonth = {};

  for (const s of allSessions) {
    for (const p of s.pieces) pieceCounts[p] = (pieceCounts[p] || 0) + 1;
    for (const sk of s.skills) skillCounts[sk] = (skillCounts[sk] || 0) + 1;
    if (new Date(s.date) >= monthStart) {
      for (const sk of s.skills) skillCountsThisMonth[sk] = (skillCountsThisMonth[sk] || 0) + 1;
    }
  }

  const topPieces = Object.entries(pieceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topSkillThisMonth = Object.entries(skillCountsThisMonth)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)[0] || null;

  // Streak: consecutive days with at least one session, ending today
  const practicedDays = new Set(
    allSessions.map(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  let check = todayStart.getTime();
  while (practicedDays.has(check)) {
    streak++;
    check -= DAY_MS;
  }

  res.json({
    totalMinutesAllTime: allTime._sum.durationMinutes || 0,
    totalSessionsAllTime: allTime._count,
    totalMinutesThisWeek: thisWeek._sum.durationMinutes || 0,
    totalMinutesThisMonth: thisMonth._sum.durationMinutes || 0,
    topPieces,
    topSkills,
    topSkillThisMonth,
    streak,
  });
}

async function create(req, res) {
  const { durationMinutes, pieces = [], skills = [], notes, reedId } = req.body;

  const session = await prisma.practiceSession.create({
    data: {
      userId: req.user.id,
      durationMinutes: Number(durationMinutes),
      pieces,
      skills,
      notes: notes || null,
      reedId: reedId || null,
    },
    include: { reed: { select: { identifier: true, reedType: true } } },
  });

  if (reedId) {
    await prisma.reed.update({
      where: { id: reedId },
      data: { usageMinutes: { increment: Number(durationMinutes) } },
    });
  }

  res.status(201).json(session);
}

async function remove(req, res) {
  const { id } = req.params;
  const existing = await prisma.practiceSession.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Session not found' });
  if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  if (existing.reedId) {
    await prisma.reed.update({
      where: { id: existing.reedId },
      data: { usageMinutes: { decrement: existing.durationMinutes } },
    });
  }

  await prisma.practiceSession.delete({ where: { id } });
  res.status(204).send();
}

async function insights(req, res) {
  const { generateInsights } = require('../services/aiInsights');
  const result = await generateInsights(req.user.id);
  res.json(result);
}

async function pieces(req, res) {
  const sessions = await prisma.practiceSession.findMany({
    where: { userId: req.user.id },
    select: { pieces: true },
    orderBy: { date: 'desc' },
  });

  const seen = new Set();
  const result = [];
  for (const s of sessions) {
    for (const p of s.pieces) {
      if (!seen.has(p)) {
        seen.add(p);
        result.push(p);
      }
    }
  }

  res.json(result);
}

module.exports = { list, summary, create, remove, insights, pieces };
