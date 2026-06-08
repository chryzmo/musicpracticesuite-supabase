const router = require('express').Router();
const auth = require('../middleware/auth');
const { list, summary, create, remove, insights, pieces } = require('../controllers/practiceController');

router.use(auth);

router.get('/summary', summary);
router.get('/insights', insights);
router.get('/pieces', pieces);
router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
