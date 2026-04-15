const bcrypt = require('bcryptjs');
const db     = require('../../config/database');
const path   = require('path');
const fs     = require('fs');

// GET /api/user/profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, username, email, phone, photo FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    const user = rows[0];
    user.photoUrl = user.photo
      ? `${process.env.BASE_URL || 'http://localhost:8000'}/uploads/${user.photo}`
      : null;
    return res.status(200).json(user);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// PUT /api/user/profile
exports.updateProfile = async (req, res) => {
  const { name, email, username, phone } = req.body;

  if (!name || !username) {
    return res.status(400).json({ message: 'Name dan username wajib diisi.' });
  }

  try {
    // Cek username sudah dipakai user lain
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan.' });
    }

    await db.query(
      'UPDATE users SET name = ?, email = ?, username = ?, phone = ? WHERE id = ?',
      [name, email, username, phone, req.user.id]
    );

    return res.status(200).json({
      message: 'Profil berhasil diperbarui.',
      name, email, username, phone,
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// PUT /api/user/password
exports.updatePassword = async (req, res) => {
  // Tambahkan log ini untuk memastikan data masuk dari frontend
  console.log("Data diterima dari frontend:", req.body);

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Password baru dan konfirmasi tidak cocok.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    // Cek password lama
    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password lama tidak sesuai.' });
    }

    // Hash dan simpan password baru
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashed, req.user.id]
    );

    return res.status(200).json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('updatePassword error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/user/photo
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload.' });
    }

    // Hapus foto lama jika ada
    const [rows] = await db.query('SELECT photo FROM users WHERE id = ?', [req.user.id]);
    if (rows[0]?.photo) {
      const oldPath = path.join(__dirname, '../../uploads', rows[0].photo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.query('UPDATE users SET photo = ? WHERE id = ?', [req.file.filename, req.user.id]);

    const photoUrl = `${process.env.BASE_URL || 'http://localhost:8000'}/uploads/${req.file.filename}`;
    return res.status(200).json({ message: 'Foto berhasil diupload.', photoUrl });
  } catch (err) {
    console.error('uploadPhoto error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// DELETE /api/user/photo
exports.deletePhoto = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT photo FROM users WHERE id = ?', [req.user.id]);
    if (rows[0]?.photo) {
      const filePath = path.join(__dirname, '../../uploads', rows[0].photo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await db.query('UPDATE users SET photo = NULL WHERE id = ?', [req.user.id]);
    }
    return res.status(200).json({ message: 'Foto berhasil dihapus.' });
  } catch (err) {
    console.error('deletePhoto error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};