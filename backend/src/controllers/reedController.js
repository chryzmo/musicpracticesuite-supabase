const prisma = require('../db/prisma');

async function listActive(req, res) {
  const reeds = await prisma.reed.findMany({
    where: { userId: req.user.id, isActive: true },
    orderBy: { openDate: 'desc' },
  });
  res.json(reeds);
}

async function listAll(req, res) {
  const reeds = await prisma.reed.findMany({
    where: { userId: req.user.id },
    orderBy: { openDate: 'desc' },
  });
  res.json(reeds);
}

async function create(req, res) {
  const { identifier, reedType, openDate, notes } = req.body;
  const reed = await prisma.reed.create({
    data: {
      userId: req.user.id,
      identifier,
      reedType,
      openDate: openDate ? new Date(openDate) : new Date(),
      notes: notes || null,
    },
  });
  res.status(201).json(reed);
}

async function update(req, res) {
  const { id } = req.params;
  const existing = await prisma.reed.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Reed not found' });
  if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { notes, retireDate, usageMinutes } = req.body;
  const data = {};
  if (notes !== undefined) data.notes = notes;
  if (retireDate !== undefined) data.retireDate = retireDate ? new Date(retireDate) : null;
  if (usageMinutes !== undefined) data.usageMinutes = Number(usageMinutes);

  const reed = await prisma.reed.update({ where: { id }, data });
  res.json(reed);
}

async function retire(req, res) {
  const { id } = req.params;
  const existing = await prisma.reed.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Reed not found' });
  if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const reed = await prisma.reed.update({
    where: { id },
    data: { isActive: false, retireDate: new Date() },
  });
  res.json(reed);
}

module.exports = { listActive, listAll, create, update, retire };
