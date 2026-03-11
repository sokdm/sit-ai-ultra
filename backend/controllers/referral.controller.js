const User = require('../models/User');
const Referral = require('../models/Referral');
const config = require('../config/config');

exports.getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Generate code if not exists
    if (!user.referralCode) {
      user.referralCode = user.generateReferralCode();
      await user.save();
    }

    const referrals = await Referral.find({ referrer: req.user.id })
      .populate('referred', 'firstName createdAt');

    const completedReferrals = referrals.filter(r => r.status === 'completed').length;
    const rewardedReferrals = referrals.filter(r => r.status === 'rewarded').length;

    res.json({
      success: true,
      referralCode: user.referralCode,
      totalInvited: referrals.length,
      completed: completedReferrals,
      rewarded: rewardedReferrals,
      required: config.REFERRAL_REQUIRED_INVITES,
      rewardDays: config.REFERRAL_REWARD_DAYS,
      referrals: referrals.map(r => ({
        name: r.referred.firstName,
        date: r.createdAt,
        status: r.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
};

exports.processReferral = async (referralCode, newUserId) => {
  try {
    const referrer = await User.findOne({ referralCode });
    if (!referrer) return false;

    // Create referral record
    const referral = new Referral({
      referrer: referrer._id,
      referred: newUserId,
      referralCode,
      status: 'completed'
    });

    await referral.save();

    // Update referrer count
    referrer.referralCount += 1;
    await referrer.save();

    // Check if referrer qualifies for reward
    const completedCount = await Referral.countDocuments({
      referrer: referrer._id,
      status: 'completed'
    });

    if (completedCount >= config.REFERRAL_REQUIRED_INVITES && 
        completedCount % config.REFERRAL_REQUIRED_INVITES === 0) {
      
      // Extend subscription or add free days
      if (referrer.subscriptionStatus === 'active') {
        referrer.subscriptionEndDate = new Date(
          referrer.subscriptionEndDate.getTime() + 
          config.REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000
        );
      } else {
        // Give free trial extension
        referrer.isTrialActive = true;
        referrer.trialEndDate = new Date(
          Date.now() + config.REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000
        );
      }
      
      referrer.referralRewardsEarned += config.REFERRAL_REWARD_DAYS;
      await referrer.save();

      // Update referral status
      const recentReferrals = await Referral.find({
        referrer: referrer._id,
        status: 'completed'
      }).sort({ createdAt: -1 }).limit(config.REFERRAL_REQUIRED_INVITES);
      
      for (const ref of recentReferrals) {
        ref.status = 'rewarded';
        ref.rewardedAt = new Date();
        await ref.save();
      }

      // Notify referrer (could use socket or email)
      if (global.emitToUser) {
        global.emitToUser(referrer._id, 'referral_reward', {
          message: `Congratulations! You've earned ${config.REFERRAL_REWARD_DAYS} days free!`,
          rewardDays: config.REFERRAL_REWARD_DAYS
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Referral processing error:', error);
    return false;
  }
};
