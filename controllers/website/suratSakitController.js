// controllers/website/suratSakitController.js
const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

// ── GET semua surat sakit (admin) ─────────────────────────────────────────────
const getAllSuratSakit = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ss.id,
        ss.user_id,
        ss.rekam_medis_id,
        ss.tanggal_mulai,
        ss.tanggal_selesai,
        ss.keterangan,
        ss.status,
        ss.hash_blockchain,
        ss.verified_at,
        ss.verified_by,
        ss.created_at,
        u.name        AS nama_pasien,
        mp.nim,
        mp.fakultas,
        mp.jurusan,
        rm.diagnosa,
        rm.keluhan,
        rm.tindakan,
        rm.dokter_id,
        vd.name       AS nama_dokter
      FROM surat_sakit ss
      JOIN users u ON u.id = ss.user_id
      LEFT JOIN mahasiswa_profiles mp ON mp.user_id = ss.user_id
      LEFT JOIN rekam_medis rm ON rm.id = ss.rekam_medis_id
      LEFT JOIN users vd ON vd.id = ss.verified_by
      ORDER BY ss.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAllSuratSakit error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data surat sakit' });
  }
};

// ── GET surat sakit by ID ─────────────────────────────────────────────────────
const getSuratSakitById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.query(`
      SELECT
        ss.*,
        u.name        AS nama_pasien,
        mp.nim, mp.fakultas, mp.jurusan, mp.alamat,
        rm.diagnosa, rm.keluhan, rm.tindakan, rm.catatan, rm.tanggal AS tanggal_periksa,
        rm.dokter_id,
        vd.name       AS nama_dokter
      FROM surat_sakit ss
      JOIN users u ON u.id = ss.user_id
      LEFT JOIN mahasiswa_profiles mp ON mp.user_id = ss.user_id
      LEFT JOIN rekam_medis rm ON rm.id = ss.rekam_medis_id
      LEFT JOIN users vd ON vd.id = ss.verified_by
      WHERE ss.id = ?
    `, [id]);
    if (!row) return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('getSuratSakitById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil surat sakit' });
  }
};

// ── POST buat surat sakit baru (dari rekam medis yang sudah ada) ──────────────
const createSuratSakit = async (req, res) => {
  try {
    const { user_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan } = req.body;
    if (!user_id || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ success: false, message: 'user_id, tanggal_mulai, tanggal_selesai wajib diisi' });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO surat_sakit (id, user_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, user_id, rekam_medis_id || null, tanggal_mulai, tanggal_selesai, keterangan || '']
    );
    res.status(201).json({
      success: true,
      message: 'Surat sakit berhasil dibuat',
      data: { id, user_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan, status: 'pending' },
    });
  } catch (error) {
    console.error('createSuratSakit error:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat surat sakit' });
  }
};

// ── PATCH verifikasi surat sakit (dokter) ─────────────────────────────────────
// status: 'terverifikasi' | 'ditolak'
const verifikasiSuratSakit = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hash_blockchain } = req.body;
    const dokter_id = req.user.id; // dari token login dokter

    if (!['terverifikasi', 'ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status harus terverifikasi atau ditolak' });
    }

    const [[existing]] = await db.query('SELECT id FROM surat_sakit WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });

    await db.query(
      `UPDATE surat_sakit
       SET status = ?, verified_by = ?, verified_at = NOW(), hash_blockchain = ?
       WHERE id = ?`,
      [status, dokter_id, hash_blockchain || null, id]
    );

    res.json({ success: true, message: `Surat sakit berhasil ${status}` });
  } catch (error) {
    console.error('verifikasiSuratSakit error:', error);
    res.status(500).json({ success: false, message: 'Gagal memverifikasi surat sakit' });
  }
};

// ── DELETE surat sakit ────────────────────────────────────────────────────────
const deleteSuratSakit = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query('SELECT id FROM surat_sakit WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });
    await db.query('DELETE FROM surat_sakit WHERE id = ?', [id]);
    res.json({ success: true, message: 'Surat sakit berhasil dihapus' });
  } catch (error) {
    console.error('deleteSuratSakit error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus surat sakit' });
  }
};

module.exports = {
  getAllSuratSakit,
  getSuratSakitById,
  createSuratSakit,
  verifikasiSuratSakit,
  deleteSuratSakit,
};