import nodemailer from 'nodemailer';

const ticketingEmail = process.env.SMTP_EMAIL;
const ticketingPass = process.env.SMTP_PASSWORD;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: ticketingEmail,
    pass: ticketingPass,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
});

export default async function sendVerificationCode(email: string, verificationCode: string) {
  try {
    const mailOptions = {
      from: `"票務平台" <${ticketingEmail}>`,
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

    // Verify the transport
    await transporter.verify();

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
}
