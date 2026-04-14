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

async function testEmail() {
  try {
    await transporter.verify();
    console.log('✅ Koneksi email berhasil!');

    await transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // kirim ke diri sendiri dulu
      subject: 'Test Email MedChain',
      html: '<h2>Test berhasil! 🎉</h2><p>Nodemailer berjalan dengan baik.</p>',
    });

    console.log('✅ Email test berhasil dikirim!');
  } catch (err) {
    console.log('❌ Gagal:', err.message);
  }
}

testEmail();