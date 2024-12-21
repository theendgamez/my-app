import nodemailer from 'nodemailer';

const ticketingEmail = process.env.TICKETING_EMAIL;
const ticketingPass = process.env.TICKETING_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: ticketingEmail,
    pass: ticketingPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export default async function sendVerificationCode(email: string, verificationCode: string) {
  const mailOptions = {
    from: `No Reply <${ticketingEmail}>`,
    to: email,
    subject: '您的驗證碼',
    html: `<p>感謝您的註冊！以下是您的驗證碼：</p>
           <h3>${verificationCode}</h3>
           <p>請在 10 分鐘內完成驗證。</p>`,
  };

  await transporter.sendMail(mailOptions);
}