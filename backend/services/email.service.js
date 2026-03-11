const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendMail(to, subject, html, text) {
    try {
      const info = await this.transporter.sendMail({
        from: `"SIT AI Ultra" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }

  async sendOTP(email, otp, firstName) {
    const subject = 'Your SIT AI Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
        <h2 style="text-align: center; margin-bottom: 30px;">🎓 SIT AI Ultra</h2>
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 8px; text-align: center;">
          <h3>Hello ${firstName},</h3>
          <p>Your verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 5px;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px;">
          <p>CEO: Wisdom | support: wsdmpresh@gmail.com</p>
          <p>© 2024 SIT AI Ultra. All rights reserved.</p>
        </div>
      </div>
    `;
    const text = `Your SIT AI verification code is: ${otp}. Expires in 10 minutes.`;
    return this.sendMail(email, subject, html, text);
  }

  async sendWelcome(email, firstName) {
    const subject = 'Welcome to SIT AI Ultra!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1>🎓 Welcome to SIT AI Ultra!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <h2>Hi ${firstName},</h2>
          <p>Your AI-powered learning journey starts now!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 Your 1-Day Free Trial Includes:</h3>
            <ul style="line-height: 1.8;">
              <li>🤖 Personal AI Tutor (Text + Voice)</li>
              <li>📝 Smart Quizzes with Leaderboard</li>
              <li>📚 Study Timetable with Reminders</li>
              <li>💻 Code Learning (Python, JS, Java, C++)</li>
              <li>🎯 All School Subjects Support</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Start Learning Now</a>
          </div>
          <p style="color: #666; font-size: 12px;">Questions? Contact us at wsdmpresh@gmail.com</p>
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html, `Welcome to SIT AI, ${firstName}!`);
  }

  async sendPasswordReset(email, resetUrl, firstName) {
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p>Or copy: ${resetUrl}</p>
        <p>Expires in 30 minutes.</p>
      </div>
    `;
    return this.sendMail(email, subject, html, `Reset password: ${resetUrl}`);
  }

  async sendTimetableReminder(email, scheduleItem, firstName) {
    const subject = `📚 Study Reminder: ${scheduleItem.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; color: white; padding: 20px; text-align: center;">
          <h2>⏰ Study Time!</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h3>Hi ${firstName},</h3>
          <p>Your scheduled study session is starting soon:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4>${scheduleItem.subject}</h4>
            <p><strong>Topic:</strong> ${scheduleItem.topic || 'General'}</p>
            <p><strong>Time:</strong> ${scheduleItem.startTime} - ${scheduleItem.endTime}</p>
            <p><strong>Day:</strong> ${scheduleItem.dayOfWeek}</p>
            ${scheduleItem.notes ? `<p><strong>Notes:</strong> ${scheduleItem.notes}</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/timetable.html" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Timetable</a>
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html, `Study reminder: ${scheduleItem.subject} at ${scheduleItem.startTime}`);
  }

  async sendPaymentConfirmation(email, payment, firstName) {
    const subject = 'Payment Successful - SIT AI Ultra';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h2>✅ Payment Successful!</h2>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h3>Thank you, ${firstName}!</h3>
          <p>Your subscription is now active.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Plan:</strong> ${payment.plan}</p>
            <p><strong>Amount:</strong> $${payment.amount}</p>
            <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
            <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
          </div>
          <p>Start learning now!</p>
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html, `Payment confirmed: $${payment.amount}`);
  }
}

module.exports = new EmailService();
