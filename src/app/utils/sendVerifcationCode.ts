import nodemailer from 'nodemailer';

const ticketingEmail = process.env.SMTP_EMAIL;
const ticketingPass = process.env.SMTP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  auth: {
    user: ticketingEmail,
    pass: ticketingPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export default async function sendVerificationCode(email: string, verificationCode: string) {
  try {
    const mailOptions = {
      from: `"票務平台" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '電子郵件驗證碼',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>歡迎註冊票務平台</h2>
          <p>您的驗證碼是：</p>
          <h1 style="color: #4A90E2; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
          <p>此驗證碼將在 10 分鐘後失效。</p>
          <p>如果這不是您的操作，請忽略此郵件。</p>
        </div>
      `,
    };

    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}