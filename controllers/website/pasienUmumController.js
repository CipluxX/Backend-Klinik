const db = require('../../config/database');

const getAllPasienUmum = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM pasien_umum ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAllPasienUmum error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

const getPasienUmumById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[data]] = await db.query('SELECT * FROM pasien_umum WHERE id = ?', [id]);
    if (!data) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

const createPasienUmum = async (req, res) => {
  try {
    const { nama, alamat, telp, email } = req.body;
    if (!nama) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    const [result] = await db.query(
      `INSERT INTO pasien_umum (nama, alamat, telp, email, riwayat, status_aktif)
       VALUES (?, ?, ?, ?, '-', '-')`,
      [nama, alamat || '', telp || '', email || '']
    );
    res.status(201).json({
      success: true,
      message: 'Berhasil ditambahkan',
      data: {
        id: result.insertId,
        nama, alamat, telp, email,
        riwayat: '-', statusAktif: '-',
        jadwalMenunggu: [], jadwalSelesai: [],
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan data' });
  }
};

const deletePasienUmum = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query('SELECT id FROM pasien_umum WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    await db.query('DELETE FROM pasien_umum WHERE id = ?', [id]);
    res.json({ success: true, message: 'Berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data' });
  }
};

module.exports = { getAllPasienUmum, getPasienUmumById, createPasienUmum, deletePasienUmum };