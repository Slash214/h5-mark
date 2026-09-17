const router = require('express').Router();
const { adminAuth } = require('../../middleware/auth');

router.use('/', require('./auth'));          // /login 不鉴权
router.use('/configs', adminAuth, require('./config'));
router.use('/articles', adminAuth, require('./article'));
router.use('/orders', adminAuth, require('./order'));
router.use('/members', adminAuth, require('./member'));
router.use('/tasks', adminAuth, require('./task'));
router.use('/platforms', adminAuth, require('./platform'));
router.use('/stat', adminAuth, require('./stat'));
router.use('/upload', adminAuth, require('./upload'));

module.exports = router;
