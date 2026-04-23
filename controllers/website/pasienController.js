// src/controllers/pasienController.js
const db = require('../../config/database');

// ── GET /api/pasien ───────────────────────────────────────────────────────────
// Ambil semua pasien beserta jadwalnya
const getAllPasien = async (req, res) => {
  try {
    const [pasienRows] = await db.query(
      'SELECT * FROM pasien ORDER BY created_at DESC'
    );

    // Ambil semua jadwal sekaligus lalu groupkan per pasien_id
    const [jadwalRows] = await db.query('SELECT * FROM jadwal ORDER BY no ASC');

    const result = pasienRows.map((p) => {
      const jadwal = jadwalRows.filter((j) => j.pasien_id === p.id);
      return {
        id:            p.id,
        nama:          p.nama,
        nim:           p.nim,
        alamat:        p.alamat,
        fakultas:      p.fakultas,
        jurusan:       p.jurusan,
        telp:          p.telp,
        email:         p.email,
        riwayat:       p.riwayat,
        statusAktif:   p.status_aktif,
        jadwalMenunggu: jadwal.filter((j) => j.status === 'menunggu').map(mapJadwal),
        jadwalSelesai:  jadwal.filter((j) => j.status === 'selesai').map(mapJadwal),
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getAllPasien error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pasien' });
  }
};

// ── GET /api/pasien/:id ───────────────────────────────────────────────────────
const getPasienById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[pasien]] = await db.query('SELECT * FROM pasien WHERE id = ?', [id]);

    if (!pasien) {
      return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan' });
    }

    const [jadwalRows] = await db.query(
      'SELECT * FROM jadwal WHERE pasien_id = ? ORDER BY no ASC', [id]
    );

    res.json({
      success: true,
      data: {
        id:            pasien.id,
        nama:          pasien.nama,
        nim:           pasien.nim,
        alamat:        pasien.alamat,
        fakultas:      pasien.fakultas,
        jurusan:       pasien.jurusan,
        telp:          pasien.telp,
        email:         pasien.email,
        riwayat:       pasien.riwayat,
        statusAktif:   pasien.status_aktif,
        jadwalMenunggu: jadwalRows.filter((j) => j.status === 'menunggu').map(mapJadwal),
        jadwalSelesai:  jadwalRows.filter((j) => j.status === 'selesai').map(mapJadwal),
      },
    });
  } catch (error) {
    console.error('getPasienById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pasien' });
  }
};

// ── POST /api/pasien ──────────────────────────────────────────────────────────
const createPasien = async (req, res) => {
  try {
    const { nama, nim, alamat, fakultas, jurusan, telp, email } = req.body;

    // Validasi wajib
    if (!nama || !nim) {
      return res.status(400).json({ success: false, message: 'Nama dan NIM wajib diisi' });
    }

    // Cek NIM duplikat
    const [[existing]] = await db.query('SELECT id FROM pasien WHERE nim = ?', [nim]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'NIM sudah terdaftar' });
    }

    const [result] = await db.query(
      `INSERT INTO pasien (nama, nim, alamat, fakultas, jurusan, telp, email, riwayat, status_aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, '-', '-')`,
      [nama, nim, alamat || '', fakultas || '', jurusan || '', telp || '', email || '']
    );

    res.status(201).json({
      success: true,
      message: 'Pasien berhasil ditambahkan',
      data: {
        id:            result.insertId,
        nama, nim, alamat, fakultas, jurusan, telp, email,
        riwayat:       '-',
        statusAktif:   '-',
        jadwalMenunggu: [],
        jadwalSelesai:  [],
      },
    });
  } catch (error) {
    console.error('createPasien error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan pasien' });
  }
};

// ── DELETE /api/pasien/:id ────────────────────────────────────────────────────
const deletePasien = async (req, res) => {
  try {
    const { id } = req.params;
    const [[pasien]] = await db.query('SELECT id FROM pasien WHERE id = ?', [id]);

    if (!pasien) {
      return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan' });
    }

    // Jadwal akan ikut terhapus karena ON DELETE CASCADE
    await db.query('DELETE FROM pasien WHERE id = ?', [id]);

    res.json({ success: true, message: 'Pasien berhasil dihapus' });
  } catch (error) {
    console.error('deletePasien error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus pasien' });
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function mapJadwal(j) {
  return {
    id:      j.id,
    no:      j.no,
    judul:   j.judul,
    keluhan: j.keluhan,
    tanggal: j.tanggal,
    waktu:   j.waktu,
    dokter:  j.dokter,
    status:  j.status,
  };
}

module.exports = { getAllPasien, getPasienById, createPasien, deletePasien };