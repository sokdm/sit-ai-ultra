const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/login', adminController.login);
router.get('/dashboard', protect, adminOnly, adminController.getDashboard);
router.get('/users', protect, adminOnly, adminController.getUsers);
router.post('/users/:userId/manage', protect, adminOnly, adminController.manageUser);
router.get('/payments', protect, adminOnly, adminController.getPayments);
router.get('/webhooks', protect, adminOnly, adminController.getWebhookLogs);

module.exports = router;
