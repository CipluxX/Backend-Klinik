const nodemailer = require("nodemailer");

// Simpan OTP sementara di memory
// Format:
// otpStore[email] = {
//   otp: "123456",
//   expired: 1712345678901,
//   attempts: 1,
//   verified: false,
// }

const otpStore = {};

const OTP_EXPIRED_MS = 5 * 60 * 1000; // 5 menit
const MAX_SEND_ATTEMPTS = 3;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
  });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/web/otp/send
exports.sendOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email wajib diisi.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format email tidak valid.",
    });
  }

  const existing = otpStore[email];

  if (existing && existing.attempts >= MAX_SEND_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: "Batas pengiriman OTP sudah mencapai 3 kali.",
      attempts: existing.attempts,
      maxAttempts: MAX_SEND_ATTEMPTS,
    });
  }

  const otp = generateOtp();

  otpStore[email] = {
    otp,
    expired: Date.now() + OTP_EXPIRED_MS,
    attempts: existing ? existing.attempts + 1 : 1,
    verified: false,
  };

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"DipoVerify" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Kode OTP Reservasi",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Kode OTP Reservasi Anda</h2>
          <p>Gunakan kode berikut untuk verifikasi email:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
            ${otp}
          </div>
          <p>Kode ini berlaku selama <strong>5 menit</strong>.</p>
          <p>Jangan bagikan kode ini kepada siapa pun.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP berhasil dikirim.",
      attempts: otpStore[email].attempts,
      maxAttempts: MAX_SEND_ATTEMPTS,
      expiredInMs: OTP_EXPIRED_MS,
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    // hapus OTP jika email gagal dikirim
    delete otpStore[email];

    return res.status(500).json({
      success: false,
      message: "Gagal kirim OTP.",
      error: error.message,
    });
  }
};

// POST /api/web/otp/verify
exports.verifyOtp = (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email dan OTP wajib diisi.",
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "OTP harus 6 digit.",
    });
  }

  const data = otpStore[email];

  if (!data) {
    return res.status(400).json({
      success: false,
      message: "OTP tidak ditemukan. Silakan kirim OTP terlebih dahulu.",
    });
  }

  if (Date.now() > data.expired) {
    delete otpStore[email];
    return res.status(400).json({
      success: false,
      message: "OTP kadaluarsa. Silakan kirim ulang OTP.",
    });
  }

  if (data.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: "OTP salah.",
    });
  }

  otpStore[email].verified = true;

  // hapus setelah verifikasi sukses
  delete otpStore[email];

  return res.status(200).json({
    success: true,
    message: "OTP valid.",
  });
};