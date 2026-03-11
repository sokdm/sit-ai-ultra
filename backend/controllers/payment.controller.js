const flutterwaveService = require('../payment-services/flutterwave.service');
const Payment = require('../models/Payment');

exports.initializePayment = async (req, res) => {
  try {
    const { plan } = req.body;
    
    // req.user is already attached by protect middleware
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/dashboard/payment-success.html`;

    const result = await flutterwaveService.initializePayment(user, plan, redirectUrl);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      paymentLink: result.paymentLink,
      txRef: result.txRef
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.query;

    const verification = await flutterwaveService.verifyTransaction(transactionId);

    if (!verification || verification.status !== 'successful') {
      return res.json({ success: false, status: verification?.status || 'failed' });
    }

    res.json({
      success: true,
      status: 'successful',
      amount: verification.amount,
      currency: verification.currency
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const result = await flutterwaveService.handleWebhook(req.body, signature);

    if (result.success) {
      res.status(200).send('OK');
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).send('Error');
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-webhookData');

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const status = await flutterwaveService.checkSubscriptionStatus(req.user._id);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check subscription' });
  }
};
