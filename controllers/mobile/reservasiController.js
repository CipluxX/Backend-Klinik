const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

// GET /reservasi
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *,
       DATE_FORMAT(tanggal, '%d %M %Y') as tanggal_format,
       TIME_FORMAT(jam, '%H:%i') as jam_format
       FROM reservasi WHERE mahasiswa_id = ? ORDER BY tanggal DESC, jam DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// POST /reservasi
exports.create = async (req, res) => {
  try {
    const { tanggal, jam, keluhan } = req.body;

    if (!tanggal || !jam) {
      return res.status(400).json({ success: false, message: "Tanggal dan jam wajib diisi" });
    }

    // Cek tidak ada reservasi aktif di tanggal yang sama
    const [existing] = await db.query(
      "SELECT id FROM reservasi WHERE mahasiswa_id = ? AND tanggal = ? AND status = 'aktif'",
      [req.user.id, tanggal]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Anda sudah memiliki reservasi aktif di tanggal ini" });
    }

    const id = uuidv4();
    await db.query(
      "INSERT INTO reservasi (id, mahasiswa_id, tanggal, jam, keluhan) VALUES (?, ?, ?, ?, ?)",
      [id, req.user.id, tanggal, jam, keluhan || null]
    );

    // Buat notifikasi
    await db.query(
      `INSERT INTO notifikasi (id, mahasiswa_id, judul, pesan, tipe)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id,
        "Reservasi Berhasil 📅",
        `Reservasi Anda pada ${tanggal} pukul ${jam} telah terdaftar.`,
        "success"
      ]
    );

    return res.status(201).json({ success: true, message: "Reservasi berhasil dibuat", data: { id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// PUT /reservasi/:id/batal
exports.cancel = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id FROM reservasi WHERE id = ? AND mahasiswa_id = ? AND status = 'aktif'",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Reservasi tidak ditemukan atau sudah tidak aktif" });
    }
    await db.query("UPDATE reservasi SET status = 'dibatalkan' WHERE id = ?", [req.params.id]);
    return res.json({ success: true, message: "Reservasi berhasil dibatalkan" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};
