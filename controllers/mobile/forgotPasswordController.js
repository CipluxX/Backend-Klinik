const db = require("../../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /auth/forgot-password
exports.requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email wajib diisi" });
    }

    const [rows] = await db.query("SELECT id, nama FROM mahasiswa WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Email tidak terdaftar" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_tokens (mahasiswa_id, otp, expired_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = ?, expired_at = ?`,
      [rows[0].id, otp, expiredAt, otp, expiredAt]
    );

    // ✅ RESPONSE DULU
    res.json({ success: true, message: "Kode OTP telah dikirim ke email Anda" });

    // ✅ EMAIL BACKGROUND
    transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Kode OTP Reset Password - MedChain UNDIP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #E0E0E0; border-radius: 12px;">
          <h2 style="color: #1565C0; text-align: center;">MedChain UNDIP</h2>
          <p>Halo <b>${rows[0].nama}</b>,</p>
          <p>Kode OTP untuk reset password Anda:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1565C0; background: #E3F2FD; padding: 12px 24px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666;">Kode berlaku selama <b>10 menit</b>. Jangan berikan kode ini kepada siapapun.</p>
          <p style="color: #999; font-size: 12px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `,
    }).catch(err => console.error("❌ Email error:", err.message));

  } catch (err) {
    console.error("Error kirim OTP:", err);
    return res.status(500).json({ success: false, message: "Gagal mengirim OTP: " + err.message });
  }
};

// POST /auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email dan OTP wajib diisi" });
    }

    const [rows] = await db.query(
      `SELECT ot.* FROM otp_tokens ot
       JOIN mahasiswa m ON ot.mahasiswa_id = m.id
       WHERE m.email = ? AND ot.otp = ? AND ot.expired_at > NOW()`,
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await db.query(
      "UPDATE otp_tokens SET reset_token = ? WHERE id = ?",
      [resetToken, rows[0].id]
    );

    return res.json({ success: true, message: "OTP valid", data: { reset_token: resetToken } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { reset_token, password } = req.body;
    if (!reset_token || !password) {
      return res.status(400).json({ success: false, message: "Data tidak lengkap" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password minimal 8 karakter" });
    }

    const [rows] = await db.query(
      "SELECT * FROM otp_tokens WHERE reset_token = ? AND expired_at > NOW()",
      [reset_token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Token tidak valid atau sudah kadaluarsa" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query("UPDATE mahasiswa SET password = ? WHERE id = ?", [hashed, rows[0].mahasiswa_id]);
    await db.query("DELETE FROM otp_tokens WHERE id = ?", [rows[0].id]);

    return res.json({ success: true, message: "Password berhasil direset" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};