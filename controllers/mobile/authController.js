const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require('../../config/database');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { nim, password } = req.body;
    if (!nim || !password) {
      return res.status(400).json({ success: false, message: "NIM dan password wajib diisi" });
    }

    // JOIN users + mahasiswa_profiles
    const [rows] = await db.query(
      `SELECT u.*, u.name AS nama, mp.nim, mp.fakultas, mp.jurusan, mp.angkatan, mp.semester
      FROM users u
      JOIN mahasiswa_profiles mp ON mp.user_id = u.id
      WHERE mp.nim = ? AND u.role = 'mahasiswa'`,
      [nim]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "NIM tidak ditemukan" });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        message: "Email belum diverifikasi. Cek inbox email Anda."
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Password salah" });
    }

    const token = jwt.sign(
      { id: user.id, nim: user.nim, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const { password: _, ...data } = user;
    return res.json({ success: true, message: "Login berhasil", data: { token, mahasiswa: data } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { nama, nim, email, telepon, fakultas, jurusan, angkatan, password } = req.body;

    if (!nama || !nim || !email || !password) {
      return res.status(400).json({ success: false, message: "Data tidak lengkap" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password minimal 8 karakter" });
    }

    // Cek duplikat di users (email) dan mahasiswa_profiles (nim)
    const [existingEmail] = await db.query(
      "SELECT id FROM users WHERE email = ?", [email]
    );
    const [existingNim] = await db.query(
      "SELECT id FROM mahasiswa_profiles WHERE nim = ?", [nim]
    );
    if (existingEmail.length > 0 || existingNim.length > 0) {
      return res.status(409).json({ success: false, message: "NIM atau email sudah terdaftar" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Insert ke users dulu
    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password, role, is_verified, verification_token)
       VALUES (?, ?, ?, ?, 'mahasiswa', 0, ?)`,
      [nama, email, telepon, hashed, verificationToken]
    );

    // Insert ke mahasiswa_profiles
    await db.query(
      `INSERT INTO mahasiswa_profiles (user_id, nim, fakultas, jurusan, angkatan)
       VALUES (?, ?, ?, ?, ?)`,
      [result.insertId, nim, fakultas, jurusan, angkatan || null]
    );

    const verifyUrl = `http://${process.env.SERVER_IP || 'localhost'}:${process.env.PORT || 3000}/api/auth/verify-email?token=${verificationToken}`;

    transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifikasi Email - MedChain UNDIP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #E0E0E0; border-radius: 12px;">
          <h2 style="color: #1565C0; text-align: center;">MedChain UNDIP</h2>
          <p>Halo <b>${nama}</b>,</p>
          <p>Terima kasih sudah mendaftar! Klik tombol di bawah untuk verifikasi email Anda:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #1565C0; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Verifikasi Email
            </a>
          </div>
          <p style="color: #666;">Atau copy link ini ke browser:</p>
          <p style="color: #1565C0; word-break: break-all; font-size: 12px;">${verifyUrl}</p>
          <p style="color: #999; font-size: 12px;">Jika Anda tidak mendaftar, abaikan email ini.</p>
        </div>
      `,
    }).then(() => {
      console.log("✅ Email verifikasi terkirim ke:", email);
    }).catch(err => {
      console.error("❌ Gagal kirim verifikasi:", err.message);
    });

    return res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil! Cek email Anda untuk verifikasi."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server: " + err.message });
  }
};

// GET /auth/verify-email?token=xxx
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: red;">❌ Token tidak valid</h2>
        </body></html>
      `);
    }

    const [rows] = await db.query(
      "SELECT id FROM users WHERE verification_token = ? AND is_verified = 0",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: orange;">⚠️ Token tidak valid atau email sudah diverifikasi</h2>
        </body></html>
      `);
    }

    await db.query(
      "UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?",
      [rows[0].id]
    );

    return res.send(`
      <html><body style="font-family: Arial; text-align: center; padding: 50px; background: #f0f4f8;">
        <div style="max-width: 400px; margin: auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
          <h2 style="color: #1565C0;">Email Berhasil Diverifikasi!</h2>
          <p style="color: #666;">Akun Anda sudah aktif. Silakan login di aplikasi MedChain UNDIP.</p>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error(err);
    return res.status(500).send(`
      <html><body style="text-align: center; padding: 50px;">
        <h2 style="color: red;">❌ Terjadi kesalahan server</h2>
      </body></html>
    `);
  }
};

// POST /auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id, name, is_verified FROM users WHERE email = ? AND role = 'mahasiswa'",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Email tidak terdaftar" });
    }

    if (rows[0].is_verified) {
      return res.status(400).json({ success: false, message: "Email sudah diverifikasi" });
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    await db.query(
      "UPDATE users SET verification_token = ? WHERE id = ?",
      [newToken, rows[0].id]
    );

    const verifyUrl = `http://${process.env.SERVER_IP || 'localhost'}:${process.env.PORT || 3000}/api/auth/verify-email?token=${newToken}`;

    transporter.sendMail({
      from: `"MedChain UNDIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifikasi Email - MedChain UNDIP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #E0E0E0; border-radius: 12px;">
          <h2 style="color: #1565C0; text-align: center;">MedChain UNDIP</h2>
          <p>Halo <b>${rows[0].name}</b>,</p>
          <p>Klik tombol di bawah untuk verifikasi email Anda:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #1565C0; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Verifikasi Email
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">Link berlaku selama 24 jam.</p>
        </div>
      `,
    }).then(() => {
      console.log("✅ Email verifikasi ulang terkirim ke:", email);
    }).catch(err => {
      console.error("❌ Gagal kirim verifikasi ulang:", err.message);
    });

    return res.json({ success: true, message: "Email verifikasi telah dikirim ulang" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Gagal: " + err.message });
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    await db.query("UPDATE users SET push_token = NULL WHERE id = ?", [req.user.id]);
    return res.json({ success: true, message: "Logout berhasil" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};