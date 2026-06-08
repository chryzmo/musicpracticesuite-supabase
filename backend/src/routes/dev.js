const router = require('express').Router();

if (process.env.NODE_ENV !== 'production') {
  const jwt = require('jsonwebtoken');
  const prisma = require('../db/prisma');

  router.post('/token', async (req, res) => {
    const { email = 'dev@example.com' } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: `dev_${email}`,
          email,
          displayName: 'Dev User',
        },
      });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.AUTH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id });
  });
}

module.exports = router;
