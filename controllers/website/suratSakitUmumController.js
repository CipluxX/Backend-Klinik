// controllers/website/suratSakitUmumController.js
const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

// ── GET semua surat sakit umum (admin) ────────────────────────────────────────
const getAllSuratSakitUmum = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        ssu.id,
        ssu.pasien_umum_id,
        ssu.rekam_medis_id,
        ssu.tanggal_mulai,
        ssu.tanggal_selesai,
        ssu.keterangan,
        ssu.status,
        ssu.hash_blockchain,
        ssu.verified_at,
        ssu.verified_by,
        ssu.created_at,
        pu.nama          AS nama_pasien,
        pu.alamat,
        pu.telp,
        pu.email,
        rmu.diagnosa,
        rmu.keluhan,
        rmu.tindakan,
        rmu.catatan,
        rmu.tanggal      AS tanggal_periksa,
        rmu.dokter_id,
        ud.name          AS nama_dokter,
        uv.name          AS nama_verifikator
      FROM surat_sakit_umum ssu
      JOIN pasien_umum        pu  ON pu.id   = ssu.pasien_umum_id
      LEFT JOIN rekam_medis_umum rmu ON rmu.id = ssu.rekam_medis_id
      LEFT JOIN users            ud  ON ud.id  = rmu.dokter_id
      LEFT JOIN users            uv  ON uv.id  = ssu.verified_by
    `;

    const params = [];
    if (status) {
      query += ' WHERE ssu.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ssu.created_at DESC';

    const [rows] = await db.query(query, params);

    // Normalisasi field agar sama dengan surat_sakit (mahasiswa)
    const data = rows.map((r) => ({
      ...r,
      tipe: 'umum',
      pasien_ref_id: r.pasien_umum_id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getAllSuratSakitUmum error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data surat sakit umum' });
  }
};

// ── GET surat sakit umum by ID ────────────────────────────────────────────────
const getSuratSakitUmumById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.query(`
      SELECT
        ssu.*,
        pu.nama          AS nama_pasien,
        pu.alamat,
        pu.telp,
        pu.email,
        rmu.diagnosa,
        rmu.keluhan,
        rmu.tindakan,
        rmu.catatan,
        rmu.tanggal      AS tanggal_periksa,
        rmu.dokter_id,
        ud.name          AS nama_dokter,
        uv.name          AS nama_verifikator
      FROM surat_sakit_umum ssu
      JOIN pasien_umum        pu  ON pu.id   = ssu.pasien_umum_id
      LEFT JOIN rekam_medis_umum rmu ON rmu.id = ssu.rekam_medis_id
      LEFT JOIN users            ud  ON ud.id  = rmu.dokter_id
      LEFT JOIN users            uv  ON uv.id  = ssu.verified_by
      WHERE ssu.id = ?
    `, [id]);

    if (!row) {
      return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });
    }

    res.json({ success: true, data: { ...row, tipe: 'umum', pasien_ref_id: row.pasien_umum_id } });
  } catch (error) {
    console.error('getSuratSakitUmumById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil surat sakit umum' });
  }
};

// ── POST buat surat sakit umum baru ───────────────────────────────────────────
const createSuratSakitUmum = async (req, res) => {
  try {
    const { pasien_umum_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan } = req.body;

    if (!pasien_umum_id || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({
        success: false,
        message: 'pasien_umum_id, tanggal_mulai, tanggal_selesai wajib diisi',
      });
    }

    // Validasi pasien_umum ada
    const [[pasien]] = await db.query(
      'SELECT id FROM pasien_umum WHERE id = ?',
      [pasien_umum_id]
    );
    if (!pasien) {
      return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan' });
    }

    // Validasi rekam_medis_umum ada (jika dikirim)
    if (rekam_medis_id) {
      const [[rm]] = await db.query(
        'SELECT id FROM rekam_medis_umum WHERE id = ?',
        [rekam_medis_id]
      );
      if (!rm) {
        return res.status(404).json({ success: false, message: 'Rekam medis tidak ditemukan' });
      }
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO surat_sakit_umum
        (id, pasien_umum_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, pasien_umum_id, rekam_medis_id || null, tanggal_mulai, tanggal_selesai, keterangan || '']
    );

    res.status(201).json({
      success: true,
      message: 'Surat sakit umum berhasil dibuat',
      data: { id, pasien_umum_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan, status: 'pending' },
    });
  } catch (error) {
    console.error('createSuratSakitUmum error:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat surat sakit umum' });
  }
};

// ── PATCH verifikasi surat sakit umum (dokter) ────────────────────────────────
const verifikasiSuratSakitUmum = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hash_blockchain } = req.body;
    const dokter_id = req.user.id;

    if (!['terverifikasi', 'ditolak'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status harus terverifikasi atau ditolak',
      });
    }

    const [[existing]] = await db.query(
      'SELECT id FROM surat_sakit_umum WHERE id = ?',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });
    }

    await db.query(
      `UPDATE surat_sakit_umum
       SET status = ?, verified_by = ?, verified_at = NOW(), hash_blockchain = ?
       WHERE id = ?`,
      [status, dokter_id, hash_blockchain || null, id]
    );

    res.json({ success: true, message: `Surat sakit berhasil ${status}` });
  } catch (error) {
    console.error('verifikasiSuratSakitUmum error:', error);
    res.status(500).json({ success: false, message: 'Gagal memverifikasi surat sakit umum' });
  }
};

// ── DELETE surat sakit umum ───────────────────────────────────────────────────
const deleteSuratSakitUmum = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query(
      'SELECT id FROM surat_sakit_umum WHERE id = ?',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Surat sakit tidak ditemukan' });
    }
    await db.query('DELETE FROM surat_sakit_umum WHERE id = ?', [id]);
    res.json({ success: true, message: 'Surat sakit umum berhasil dihapus' });
  } catch (error) {
    console.error('deleteSuratSakitUmum error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus surat sakit umum' });
  }
};

module.exports = {
  getAllSuratSakitUmum,
  getSuratSakitUmumById,
  createSuratSakitUmum,
  verifikasiSuratSakitUmum,
  deleteSuratSakitUmum,
};