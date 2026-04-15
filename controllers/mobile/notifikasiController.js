const db = require("../../config/database");

// GET /notifikasi
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *,
       CASE
         WHEN created_at >= NOW() - INTERVAL 1 MINUTE THEN 'Baru saja'
         WHEN created_at >= NOW() - INTERVAL 1 HOUR THEN CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), ' menit lalu')
         WHEN created_at >= NOW() - INTERVAL 1 DAY THEN CONCAT(TIMESTAMPDIFF(HOUR, created_at, NOW()), ' jam lalu')
         WHEN created_at >= NOW() - INTERVAL 7 DAY THEN CONCAT(TIMESTAMPDIFF(DAY, created_at, NOW()), ' hari lalu')
         ELSE DATE_FORMAT(created_at, '%d %M %Y')
       END as tanggal_relative
       FROM notifikasi WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// PUT /notifikasi/:id/baca
exports.tandaiBaca = async (req, res) => {
  try {
    await db.query(
      "UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    return res.json({ success: true, message: "Notifikasi ditandai dibaca" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};