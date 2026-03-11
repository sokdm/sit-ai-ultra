const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { protect } = require('../middleware/auth');

router.get('/info', protect, referralController.getReferralInfo);

module.exports = router;
