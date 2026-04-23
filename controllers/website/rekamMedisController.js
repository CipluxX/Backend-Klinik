// controllers/website/rekamMedisController.js
const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

// ── GET semua rekam medis mahasiswa ───────────────────────────────────────────
const getAllRekamMedis = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        rm.id,
        rm.user_id,
        rm.dokter_id,
        rm.tanggal,
        rm.diagnosa,
        rm.keluhan,
        rm.tindakan,
        rm.catatan,
        rm.created_at,
        u.name AS nama,
        mp.nim,
        mp.alamat,
        mp.fakultas,
        mp.jurusan,
        d.name AS nama_dokter
      FROM rekam_medis rm
      JOIN users u ON u.id = rm.user_id
      LEFT JOIN mahasiswa_profiles mp ON mp.user_id = rm.user_id
      LEFT JOIN users d ON d.id = rm.dokter_id AND d.role = 'dokter'
      ORDER BY rm.tanggal DESC
    `);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getAllRekamMedis error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil rekam medis",
    });
  }
};

// ── GET daftar dokter untuk dropdown ─────────────────────────────────────────
const getDokterList = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email FROM users WHERE role = 'dokter' ORDER BY name ASC`
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getDokterList error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar dokter",
    });
  }
};

// ── POST tambah rekam medis mahasiswa ─────────────────────────────────────────
const createRekamMedis = async (req, res) => {
  try {
    const { user_id, dokter_id, tanggal, keluhan, diagnosa, tindakan, catatan } = req.body;

    console.log("createRekamMedis body:", req.body);

    if (!user_id || !tanggal || !diagnosa) {
      return res.status(400).json({
        success: false,
        message: "user_id, tanggal, dan diagnosa wajib diisi",
      });
    }

    if (dokter_id) {
      const [dokterRows] = await db.query(
        `SELECT id FROM users WHERE id = ? AND role = 'dokter' LIMIT 1`,
        [Number(dokter_id)]
      );

      if (!dokterRows.length) {
        return res.status(400).json({
          success: false,
          message: "dokter_id tidak valid atau bukan role dokter",
        });
      }
    }

    const id = uuidv4();

    await db.query(
      `INSERT INTO rekam_medis
        (id, user_id, dokter_id, tanggal, diagnosa, keluhan, tindakan, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        Number(user_id),
        dokter_id ? Number(dokter_id) : null,
        tanggal,
        diagnosa,
        keluhan || "",
        tindakan || "",
        catatan || "",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Rekam medis berhasil ditambahkan",
      data: {
        id,
        user_id,
        dokter_id,
        tanggal,
        diagnosa,
        keluhan,
        tindakan,
        catatan,
      },
    });
  } catch (error) {
    console.error("createRekamMedis error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan rekam medis",
      detail: error.message,
    });
  }
};

// ── GET semua rekam medis non mahasiswa ───────────────────────────────────────
const getAllRekamMedisUmum = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        rmu.id,
        rmu.pasien_umum_id,
        rmu.dokter_id,
        rmu.tanggal,
        rmu.keluhan,
        rmu.diagnosa,
        rmu.tindakan,
        rmu.catatan,
        rmu.created_at,
        pu.nama,
        pu.alamat,
        pu.telp,
        pu.email,
        d.name AS nama_dokter
      FROM rekam_medis_umum rmu
      JOIN pasien_umum pu ON pu.id = rmu.pasien_umum_id
      LEFT JOIN users d ON d.id = rmu.dokter_id AND d.role = 'dokter'
      ORDER BY rmu.tanggal DESC
    `);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getAllRekamMedisUmum error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil rekam medis umum",
    });
  }
};

// ── POST tambah rekam medis non mahasiswa ─────────────────────────────────────
const createRekamMedisUmum = async (req, res) => {
  try {
    const { pasien_umum_id, dokter_id, tanggal, keluhan, diagnosa, tindakan, catatan } = req.body;

    console.log("createRekamMedisUmum body:", req.body);

    if (!pasien_umum_id || !tanggal || !diagnosa) {
      return res.status(400).json({
        success: false,
        message: "pasien_umum_id, tanggal, dan diagnosa wajib diisi",
      });
    }

    if (dokter_id) {
      const [dokterRows] = await db.query(
        `SELECT id FROM users WHERE id = ? AND role = 'dokter' LIMIT 1`,
        [Number(dokter_id)]
      );

      if (!dokterRows.length) {
        return res.status(400).json({
          success: false,
          message: "dokter_id tidak valid atau bukan role dokter",
        });
      }
    }

    const id = uuidv4();

    await db.query(
      `INSERT INTO rekam_medis_umum
        (id, pasien_umum_id, dokter_id, tanggal, diagnosa, keluhan, tindakan, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        Number(pasien_umum_id),
        dokter_id ? Number(dokter_id) : null,
        tanggal,
        diagnosa,
        keluhan || "",
        tindakan || "",
        catatan || "",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Rekam medis non mahasiswa berhasil ditambahkan",
      data: {
        id,
        pasien_umum_id,
        dokter_id,
        tanggal,
        diagnosa,
        keluhan,
        tindakan,
        catatan,
      },
    });
  } catch (error) {
    console.error("createRekamMedisUmum error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan rekam medis umum",
      detail: error.message,
    });
  }
};

module.exports = {
  getAllRekamMedis,
  getDokterList,
  createRekamMedis,
  getAllRekamMedisUmum,
  createRekamMedisUmum,
};