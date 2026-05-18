const db = require('../../config/database');

const getAllMahasiswa = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.name       AS nama,
        u.username,
        u.email,
        u.phone,
        u.role,
        u.is_verified,
        u.created_at,
        mp.nim,
        mp.fakultas,
        mp.jurusan,
        mp.angkatan,
        mp.semester,
        mp.alamat,
        mp.riwayat,
        mp.status_aktif
      FROM users u
      LEFT JOIN mahasiswa_profiles mp ON mp.user_id = u.id
      WHERE u.role = 'mahasiswa'
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAllMahasiswa error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data mahasiswa' });
  }
};

module.exports = { getAllMahasiswa };