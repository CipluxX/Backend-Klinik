const db = require("../../config/database");

// GET /api/web/reservasi
const getAllReservasi = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        j.id,
        COALESCE(j.nama, p.nama, '-') AS nama,
        COALESCE(j.nim, NULLIF(p.nim, ''), '-') AS nim,
        COALESCE(j.tipe, '-') AS tipe,
        COALESCE(j.judul, '-') AS judul,
        COALESCE(j.keluhan, '-') AS keluhan,
        COALESCE(j.tanggal, '-') AS tanggal,
        COALESCE(j.waktu, '-') AS waktu,
        COALESCE(j.dokter, '-') AS dokter,
        COALESCE(j.status, 'menunggu') AS status,
        j.created_at,
        COALESCE(j.email, p.email, '-') AS email,
        COALESCE(j.alamat, p.alamat, '-') AS alamat,
        COALESCE(j.tanggal_lahir, '-') AS tanggal_lahir,
        COALESCE(j.jenis_kelamin, '-') AS jenis_kelamin
      FROM jadwal j
      LEFT JOIN pasien p ON p.id = j.pasien_id
      ORDER BY j.created_at DESC, j.id DESC
    `);

    const mapped = rows.map((r) => ({
      id: r.id,
      tipe: r.tipe || (r.nim && r.nim !== "-" ? "Pasien Baru" : "Pasien Lama"),
      nama: r.nama || "-",
      nim: r.nim || "-",
      tanggalLahir: r.tanggal_lahir || "-",
      jenisKelamin: r.jenis_kelamin || "-",
      alamat: r.alamat || "-",
      email: r.email || "-",
      tanggalReservasi: r.tanggal || "-",
      waktuReservasi: r.waktu || "-",
      keluhan: r.keluhan || "-",
      status:
        r.status === "menunggu" ? "Menunggu" :
        r.status === "disetujui" ? "Disetujui" :
        r.status === "ditolak" ? "Ditolak" : "Menunggu",
      createdAt: r.created_at,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("getAllReservasi error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data reservasi." });
  }
};

// POST /api/web/reservasi
const createReservasi = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { tipe, nama, nim, email, tanggalLahir, jenisKelamin, alamat, tanggalReservasi, waktuReservasi, keluhan } = req.body;

    if (!nama || !email || !tanggalReservasi || !waktuReservasi || !keluhan) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, tanggal reservasi, waktu reservasi, dan keluhan wajib diisi.",
      });
    }

    await connection.beginTransaction();

    const cleanNim = nim && nim !== "-" ? nim : "-";

    const [[countToday]] = await connection.query(
      `SELECT COUNT(*) AS total FROM jadwal WHERE tanggal = ?`,
      [tanggalReservasi]
    );
    const nomorAntrian = (countToday?.total || 0) + 1;

    const [insertJadwal] = await connection.query(
      `INSERT INTO jadwal 
       (pasien_id, nama, nim, email, tanggal_lahir, jenis_kelamin, alamat, tipe, no, judul, keluhan, tanggal, waktu, dokter, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [null, nama, cleanNim, email, tanggalLahir || "-", jenisKelamin || "-", alamat || "-",
       tipe || "Pasien Baru", nomorAntrian, tipe || "Reservasi Pemeriksaan",
       keluhan, tanggalReservasi, waktuReservasi, "-", "menunggu"]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Reservasi berhasil disimpan.",
      data: {
        idReservasi: insertJadwal.insertId,
        nomorAntrian,
        nama,
        tanggalReservasi,
        waktuReservasi,
        keluhan,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("createReservasi error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan reservasi." });
  } finally {
    connection.release();
  }
};

// PATCH /api/web/reservasi/:id/status
const updateStatusReservasi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["menunggu", "disetujui", "ditolak"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid." });
    }

    const [result] = await db.query(`UPDATE jadwal SET status = ? WHERE id = ?`, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reservasi tidak ditemukan." });
    }

    return res.status(200).json({ success: true, message: "Status reservasi berhasil diperbarui." });
  } catch (error) {
    console.error("updateStatusReservasi error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status reservasi." });
  }
};

// DELETE /api/web/reservasi/:id
const deleteReservasi = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM jadwal WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reservasi tidak ditemukan." });
    }

    return res.status(200).json({ success: true, message: "Reservasi berhasil dihapus." });
  } catch (error) {
    console.error("deleteReservasi error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus reservasi." });
  }
};

module.exports = { getAllReservasi, createReservasi, updateStatusReservasi, deleteReservasi };