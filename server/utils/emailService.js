const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASS || 'ethereal_password'
    }
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      console.log(`[TEST MOCK] Email mock-sent to ${to} (Subject: ${subject})`);
      return { messageId: 'test-mock-message-id' };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Algorithm Arena" <noreply@algorithm-arena.com>',
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    // Don't throw to prevent breaking the flow if email fails
  }
};

module.exports = {
  sendEmail
};
