const router = require('express').Router();
const { auth, allow } = require('../middleware/auth');
const { wrap: w } = require('../utils/helpers');
const A = require('../controllers/authController'), M = require('../controllers/mineController'), S = require('../controllers/sensorController');
const C = require('../controllers/complianceController'), G = require('../controllers/grievanceController'), R = require('../controllers/reportController');

router.get('/public/stats', w(R.publicStats));
router.post('/public/contact', w(R.contact));
router.post('/auth/register', w(A.register));
router.post('/auth/login', w(A.login));
router.get('/auth/me', auth, w(A.me));
router.get('/users', auth, allow('admin'), w(A.listUsers));
router.patch('/users/:id', auth, allow('admin'), w(A.patchUser));
router.delete('/users/:id', auth, allow('admin'), w(A.deleteUser));

router.get('/dashboard/stats', auth, w(R.dashboard));
router.get('/activity', auth, w(R.activity));

router.get('/mines', auth, w(M.list));
router.get('/mines/:id', auth, w(M.get));
router.post('/mines', auth, allow('admin', 'operator'), w(M.create));
router.put('/mines/:id', auth, allow('admin'), w(M.update));
router.delete('/mines/:id', auth, allow('admin'), w(M.remove));
router.patch('/mines/:id/approval', auth, allow('admin'), w(M.approval));
router.post('/mines/:id/inspect', auth, allow('admin', 'inspector'), w(M.inspect));

router.get('/sensors', auth, w(S.list));
router.post('/sensors', auth, w(S.create));
router.post('/sensors/simulate', auth, w(S.simulate));

router.post('/compliance/check', auth, allow('admin', 'inspector'), w(C.check));
router.get('/compliance/summary', auth, w(C.summary));
router.get('/alerts', auth, w(C.alerts));
router.patch('/alerts/:id', auth, allow('admin', 'inspector'), w(C.patchAlert));
router.delete('/alerts/:id', auth, allow('admin'), w(C.deleteAlert));

router.get('/grievances', auth, w(G.list));
router.post('/grievances', auth, w(G.create));
router.patch('/grievances/:id', auth, allow('admin'), w(G.respond));

router.get('/reports/:type', auth, w(R.report));
module.exports = router;
