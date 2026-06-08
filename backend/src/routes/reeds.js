const router = require('express').Router();
const auth = require('../middleware/auth');
const { listActive, listAll, create, update, retire } = require('../controllers/reedController');

router.use(auth);

router.get('/', listActive);
router.get('/all', listAll);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', retire);

module.exports = router;
