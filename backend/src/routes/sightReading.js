const router = require('express').Router();
const auth = require('../middleware/auth');
const { generate, logSession } = require('../controllers/sightReadingController');

router.use(auth);

router.post('/generate', generate);
router.post('/session', logSession);

module.exports = router;
