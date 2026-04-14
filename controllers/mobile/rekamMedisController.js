const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

// GET /rekam-medis
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, tanggal, diagnosa, keluhan, dokter, catatan,
       DATE_FORMAT(tanggal, '%d %M %Y') as tanggal_format
       FROM rekam_medis WHERE mahasiswa_id = ? ORDER BY tanggal DESC`,
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
      `SELECT *, DATE_FORMAT(tanggal, '%d %M %Y') as tanggal_format
       FROM rekam_medis WHERE id = ? AND mahasiswa_id = ?`,
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
