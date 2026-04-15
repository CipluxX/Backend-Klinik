const db = require("../../config/database");

// GET /rekam-medis
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rm.id, rm.tanggal, rm.diagnosa, rm.keluhan, rm.tindakan, rm.catatan,
              d.nama AS dokter,
              DATE_FORMAT(rm.tanggal, '%d %M %Y') as tanggal_format
       FROM rekam_medis rm
       LEFT JOIN dokter d ON d.id = rm.dokter_id
       WHERE rm.user_id = ?
       ORDER BY rm.tanggal DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// GET /rekam-medis/:id
exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rm.*, d.nama AS dokter, d.spesialis,
              DATE_FORMAT(rm.tanggal, '%d %M %Y') as tanggal_format
       FROM rekam_medis rm
       LEFT JOIN dokter d ON d.id = rm.dokter_id
       WHERE rm.id = ? AND rm.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Rekam medis tidak ditemukan" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};