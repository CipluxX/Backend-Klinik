const db = require("../../config/database");

// helper normalisasi tipe pasien
function normalizeTipe(rawTipe) {
  const value = String(rawTipe || "").trim().toLowerCase();

  if (value === "mahasiswa") return "Mahasiswa";
  if (value === "non mahasiswa" || value === "nonmahasiswa") return "Non Mahasiswa";
  if (value === "pasien baru") return "Pasien Baru";
  if (value === "pasien lama") return "Pasien Lama";

  return "Non Mahasiswa";
}

// helper normalisasi status
function mapStatusToFrontend(status) {
  if (status === "disetujui") return "Disetujui";
  if (status === "ditolak") return "Ditolak";
  if (status === "selesai") return "Disetujui";
  return "Menunggu";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// GET /api/web/reservasi
const getAllReservasi = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        j.id,
        j.pasien_id,
        COALESCE(j.nama, p.nama, '-') AS nama,
        COALESCE(j.nim, NULLIF(p.nim, ''), '-') AS nim,
        COALESCE(j.email, p.email, '-') AS email,
        COALESCE(j.tanggal_lahir, '-') AS tanggal_lahir,
        COALESCE(j.jenis_kelamin, '-') AS jenis_kelamin,
        COALESCE(j.alamat, p.alamat, '-') AS alamat,
        COALESCE(j.tipe, '-') AS tipe,
        COALESCE(j.no, 0) AS no,
        COALESCE(j.judul, '-') AS judul,
        COALESCE(j.keluhan, '-') AS keluhan,
        COALESCE(j.tanggal, '-') AS tanggal,
        COALESCE(j.waktu, '-') AS waktu,
        COALESCE(j.dokter, '-') AS dokter,
        COALESCE(j.status, 'menunggu') AS status,
        j.created_at
      FROM jadwal j
      LEFT JOIN pasien p ON p.id = j.pasien_id
      ORDER BY j.created_at DESC, j.id DESC
    `);

    const mapped = rows.map((r) => ({
      id: r.id,
      pasien_id: r.pasien_id,
      tipe: normalizeTipe(r.tipe),
      nama: r.nama || "-",
      nim: r.nim || "-",
      tanggalLahir: r.tanggal_lahir || "-",
      jenisKelamin: r.jenis_kelamin || "-",
      alamat: r.alamat || "-",
      email: r.email || "-",
      tanggalReservasi: r.tanggal || "-",
      waktuReservasi: r.waktu || "-",
      keluhan: r.keluhan || "-",
      judul: r.judul || "-",
      dokter: r.dokter || "-",
      nomorAntrian: r.no || 0,
      status: mapStatusToFrontend(r.status),
      createdAt: r.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    console.error("getAllReservasi error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data reservasi.",
    });
  }
};

// POST /api/web/reservasi
// Alur tetap memakai endpoint lama.
// Frontend: OTP send -> OTP verify -> POST /api/web/reservasi.
// Backend di sini yang memastikan:
// 1. Satu email hanya 1 reservasi pada tanggal yang sama.
// 2. Reservasi langsung berhasil/disetujui tanpa approval.
const createReservasi = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      tipe,
      nama,
      nim,
      email,
      tanggalLahir,
      jenisKelamin,
      alamat,
      tanggalReservasi,
      waktuReservasi,
      keluhan,
    } = req.body;

    if (!nama || !email || !tanggalReservasi || !waktuReservasi || !keluhan) {
      return res.status(400).json({
        success: false,
        message:
          "Nama, email, tanggal reservasi, waktu reservasi, dan keluhan wajib diisi.",
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid.",
      });
    }

    await connection.beginTransaction();

    // Validasi wajib di backend:
    // Satu email hanya boleh membuat 1 reservasi pada tanggal yang sama.
    const [existingRows] = await connection.query(
      `
      SELECT id
      FROM jadwal
      WHERE LOWER(email) = LOWER(?)
        AND tanggal = ?
      LIMIT 1
      `,
      [cleanEmail, tanggalReservasi]
    );

    if (existingRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Email ini sudah membuat 1 reservasi pada tanggal tersebut.",
      });
    }

    const finalTipe = normalizeTipe(tipe);

    const cleanNim =
      finalTipe === "Mahasiswa"
        ? nim && String(nim).trim()
          ? String(nim).trim()
          : "-"
        : "-";

    const cleanTanggalLahir =
      tanggalLahir && String(tanggalLahir).trim()
        ? String(tanggalLahir).trim()
        : "-";

    const cleanJenisKelamin =
      finalTipe === "Mahasiswa"
        ? jenisKelamin && String(jenisKelamin).trim()
          ? String(jenisKelamin).trim()
          : "-"
        : "-";

    const cleanAlamat =
      alamat && String(alamat).trim() ? String(alamat).trim() : "-";

    const cleanKeluhan =
      keluhan && String(keluhan).trim() ? String(keluhan).trim() : "-";

    const cleanNama =
      nama && String(nama).trim() ? String(nama).trim() : "-";

    // Email boleh terdaftar atau belum.
    // Kalau email terdaftar di tabel pasien, pakai pasien_id.
    // Kalau tidak ada, pasien_id tetap null agar pasien baru tetap bisa reservasi.
    let pasienId = null;

    try {
      const [pasienRows] = await connection.query(
        `
        SELECT id
        FROM pasien
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
        `,
        [cleanEmail]
      );

      if (pasienRows.length > 0) {
        pasienId = pasienRows[0].id;
      }
    } catch (error) {
      console.warn("Cek pasien terdaftar dilewati:", error.message);
    }

    // Hitung nomor antrian per tanggal
    const [[countToday]] = await connection.query(
      `SELECT COUNT(*) AS total FROM jadwal WHERE tanggal = ?`,
      [tanggalReservasi]
    );

    const nomorAntrian = (countToday?.total || 0) + 1;

    const judul =
      finalTipe === "Mahasiswa"
        ? "Reservasi Mahasiswa"
        : "Reservasi Non Mahasiswa";

    const [insertJadwal] = await connection.query(
      `
      INSERT INTO jadwal
      (
        pasien_id,
        nama,
        nim,
        email,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        tipe,
        no,
        judul,
        keluhan,
        tanggal,
        waktu,
        dokter,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        pasienId,
        cleanNama,
        cleanNim,
        cleanEmail,
        cleanTanggalLahir,
        cleanJenisKelamin,
        cleanAlamat,
        finalTipe,
        nomorAntrian,
        judul,
        cleanKeluhan,
        tanggalReservasi,
        waktuReservasi,
        "-",
        "disetujui",
      ]
    );

    await connection.commit();

    const payload = {
      idReservasi: insertJadwal.insertId,
      nomorAntrian,
      nama: cleanNama,
      tanggalReservasi,
      waktuReservasi,
      keluhan: cleanKeluhan,
      status: "Disetujui",
    };

    const io = req.app.get("io");
    if (io) {
      io.emit("reservasi:baru", payload);
      io.emit("reservasi:update", payload);
    }

    return res.status(201).json({
      success: true,
      message: "Reservasi berhasil dibuat dan langsung disetujui.",
      data: payload,
    });
  } catch (error) {
    await connection.rollback();
    console.error("createReservasi error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan reservasi ke tabel jadwal.",
    });
  } finally {
    connection.release();
  }
};

// PATCH /api/web/reservasi/:id/status
// Tetap disediakan untuk kompatibilitas lama.
// Monitoring baru tidak perlu approval lagi.
const updateStatusReservasi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["menunggu", "disetujui", "ditolak", "selesai"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid.",
      });
    }

    const [result] = await db.query(
      `UPDATE jadwal SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservasi tidak ditemukan.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("reservasi:update", { id, status });
    }

    return res.status(200).json({
      success: true,
      message: "Status reservasi berhasil diperbarui.",
    });
  } catch (error) {
    console.error("updateStatusReservasi error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui status reservasi.",
    });
  }
};

// DELETE /api/web/reservasi/:id
const deleteReservasi = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM jadwal WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservasi tidak ditemukan.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("reservasi:update", { id, deleted: true });
    }

    return res.status(200).json({
      success: true,
      message: "Reservasi berhasil dihapus.",
    });
  } catch (error) {
    console.error("deleteReservasi error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus reservasi.",
    });
  }
};

module.exports = {
  getAllReservasi,
  createReservasi,
  updateStatusReservasi,
  deleteReservasi,
};
