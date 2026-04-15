const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// GET /surat-sakit
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ss.*,
              DATE_FORMAT(ss.tanggal_mulai, '%d %M %Y') as tanggal_mulai_format,
              DATE_FORMAT(ss.tanggal_selesai, '%d %M %Y') as tanggal_selesai_format,
              rm.diagnosa
       FROM surat_sakit ss
       LEFT JOIN rekam_medis rm ON ss.rekam_medis_id = rm.id
       WHERE ss.user_id = ?
       ORDER BY ss.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// GET /surat-sakit/:id
exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ss.*,
              DATE_FORMAT(ss.tanggal_mulai, '%d %M %Y') as tanggal_mulai_format,
              DATE_FORMAT(ss.tanggal_selesai, '%d %M %Y') as tanggal_selesai_format,
              rm.diagnosa, rm.tindakan,
              d.nama AS dokter, d.spesialis
       FROM surat_sakit ss
       LEFT JOIN rekam_medis rm ON ss.rekam_medis_id = rm.id
       LEFT JOIN dokter d ON d.id = rm.dokter_id
       WHERE ss.id = ? AND ss.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Surat sakit tidak ditemukan" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};