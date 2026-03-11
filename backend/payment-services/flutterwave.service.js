const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const config = require('../config/config');

class FlutterwaveService {
  constructor() {
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.publicKey = process.env.FLW_PUBLIC_KEY;
    this.encryptionKey = process.env.FLW_ENCRYPTION_KEY;
    this.baseURL = 'https://api.flutterwave.com/v3';
  }

  async initializePayment(user, plan, redirectUrl) {
    try {
      const planDetails = config.PLANS[plan];
      if (!planDetails) throw new Error('Invalid plan');

      const txRef = `SIT-${Date.now()}-${user._id.toString().slice(-6)}`;
      
      const payload = {
        tx_ref: txRef,
        amount: planDetails.price,
        currency: 'USD',
        redirect_url: redirectUrl,
        payment_options: 'card,account,ussd,mobilemoney',
        customer: {
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          phonenumber: user.phone || ''
        },
        customizations: {
          title: 'SIT AI Ultra Subscription',
          description: `${planDetails.name} - AI Tutor Access`,
          logo: `${process.env.APP_URL || 'http://localhost:3000'}/images/logo.png`
        },
        meta: {
          userId: user._id.toString(),
          plan: plan,
          planDuration: planDetails.duration
        }
      };

      const response = await axios.post(
        `${this.baseURL}/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Flutterwave response:', JSON.stringify(response.data, null, 2));

      // Extract flwRef from response - could be id or data.id depending on API version
      const flwRef = response.data?.data?.id || response.data?.id || txRef;

      // Save pending payment
      const payment = new Payment({
        user: user._id,
        transactionId: txRef,
        flwRef: flwRef,
        txRef: txRef,
        amount: planDetails.price,
        currency: 'USD',
        plan: plan,
        status: 'pending',
        customerEmail: user.email,
        customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        customerPhone: user.phone
      });
      await payment.save();

      return {
        success: true,
        paymentLink: response.data.data.link,
        txRef: txRef
      };

    } catch (error) {
      console.error('Payment init error:', error.response?.data || error);
      return { success: false, error: 'Failed to initialize payment' };
    }
  }

  async verifyTransaction(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transactions/${transactionId}/verify`,
        { headers: { 'Authorization': `Bearer ${this.secretKey}` } }
      );
      return response.data.data;
    } catch (error) {
      console.error('Verification error:', error.response?.data || error);
      return null;
    }
  }

  async handleWebhook(payload, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.FLW_WEBHOOK_SECRET || 'whsec_test')
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        return { success: false, error: 'Invalid signature' };
      }

      const { event, data } = payload;

      if (event === 'charge.completed' && data.status === 'successful') {
        const payment = await Payment.findOne({ txRef: data.tx_ref });
        if (!payment) return { success: false, error: 'Payment not found' };
        if (payment.status === 'successful') return { success: true, message: 'Already processed' };

        // Update payment
        payment.status = 'successful';
        payment.flwRef = data.id || payment.flwRef;
        payment.webhookVerified = true;
        payment.webhookData = data;
        payment.cardDetails = {
          last4digits: data.card?.last_4digits,
          brand: data.card?.type,
          expiry: data.card?.expiry
        };
        await payment.save();

        // Update user subscription
        const user = await User.findById(payment.user);
        const planDetails = config.PLANS[payment.plan];
        
        if (user && planDetails) {
          user.subscriptionStatus = 'active';
          user.subscriptionPlan = payment.plan;
          user.subscriptionStartDate = new Date();
          user.subscriptionEndDate = new Date(Date.now() + planDetails.duration * 24 * 60 * 60 * 1000);
          user.totalSpent = (user.totalSpent || 0) + payment.amount;
          await user.save();
        }

        return { success: true, message: 'Payment processed' };
      }

      return { success: true, message: 'Event processed' };
    } catch (error) {
      console.error('Webhook error:', error);
      return { success: false, error: 'Webhook processing failed' };
    }
  }

  async checkSubscriptionStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return { active: false, message: 'User not found' };
      
      const now = new Date();
      const isActive = user.subscriptionStatus === 'active' && 
                       user.subscriptionEndDate && 
                       user.subscriptionEndDate > now;
      
      return {
        active: isActive,
        plan: user.subscriptionPlan,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        daysRemaining: isActive ? Math.ceil((user.subscriptionEndDate - now) / (1000 * 60 * 60 * 24)) : 0
      };
    } catch (error) {
      console.error('Check subscription error:', error);
      return { active: false, error: 'Failed to check subscription' };
    }
  }
}

module.exports = new FlutterwaveService();
