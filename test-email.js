require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function test() {
  try {
    await transporter.verify();
    console.log('✅ Koneksi berhasil!');

    const info = await transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // kirim ke email sendiri dulu
      subject: 'Test OTP MedChain',
      html: '<h2>Kode OTP: <b>123456</b></h2>',
    });

    console.log('✅ Email terkirim!');
    console.log('Message ID:', info.messageId);
  } catch (err) {
    console.log('❌ Gagal:', err.message);
  }
}

test();