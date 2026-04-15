const db = require("../../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id, name FROM users WHERE email = ? AND role = 'mahasiswa'",
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Email tidak terdaftar" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

    // Hapus OTP lama jika ada, lalu insert baru
    await db.query("DELETE FROM otp_tokens WHERE user_id = ?", [rows[0].id]);
    await db.query(
      "INSERT INTO otp_tokens (user_id, otp, expires_at) VALUES (?, ?, ?)",
      [rows[0].id, otp, expiredAt]
    );

    transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Kode OTP Reset Password - MedChain UNDIP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #E0E0E0; border-radius: 12px;">
          <h2 style="color: #1565C0; text-align: center;">MedChain UNDIP</h2>
          <p>Halo <b>${rows[0].name}</b>,</p>
          <p>Kode OTP untuk reset password Anda:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1565C0; background: #E3F2FD; padding: 12px 24px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666;">Kode berlaku selama <b>10 menit</b>. Jangan berikan kode ini kepada siapapun.</p>
        </div>
      `,
    }).then(() => {
      console.log("✅ OTP terkirim ke:", email);
    }).catch(err => {
      console.error("❌ Gagal kirim OTP:", err.message);
    });

    return res.json({ success: true, message: "Kode OTP telah dikirim ke email Anda" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Gagal: " + err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email dan OTP wajib diisi" });
    }

    const [rows] = await db.query(
      `SELECT ot.* FROM otp_tokens ot
       JOIN users u ON ot.user_id = u.id
       WHERE u.email = ? AND ot.otp = ? AND ot.expires_at > NOW() AND ot.used = 0`,
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await db.query(
      "UPDATE otp_tokens SET reset_token = ?, used = 1 WHERE id = ?",
      [resetToken, rows[0].id]
    );

    return res.json({ success: true, message: "OTP valid", data: { reset_token: resetToken } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

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
      "SELECT * FROM otp_tokens WHERE reset_token = ? AND expires_at > NOW()",
      [reset_token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Token tidak valid atau sudah kadaluarsa" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, rows[0].user_id]);
    await db.query("DELETE FROM otp_tokens WHERE id = ?", [rows[0].id]);

    return res.json({ success: true, message: "Password berhasil direset" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};