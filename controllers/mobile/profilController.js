const db = require("../../config/database");

// GET /profil
exports.getProfil = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nama, nim, email, telepon, fakultas, jurusan, angkatan, semester FROM mahasiswa WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Profil tidak ditemukan" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// GET /dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const id = req.user.id;

    const [[{ total_rekam_medis }]] = await db.query(
      "SELECT COUNT(*) as total_rekam_medis FROM rekam_medis WHERE mahasiswa_id = ?", [id]
    );
    const [[{ total_sks }]] = await db.query(
      "SELECT COUNT(*) as total_sks FROM surat_sakit WHERE mahasiswa_id = ?", [id]
    );
    const [[{ sks_terverifikasi }]] = await db.query(
      "SELECT COUNT(*) as sks_terverifikasi FROM surat_sakit WHERE mahasiswa_id = ? AND status = 'terverifikasi'", [id]
    );
    const [[{ sks_pending }]] = await db.query(
      "SELECT COUNT(*) as sks_pending FROM surat_sakit WHERE mahasiswa_id = ? AND status = 'pending'", [id]
    );
    const [[{ notifikasi_belum_dibaca }]] = await db.query(
      "SELECT COUNT(*) as notifikasi_belum_dibaca FROM notifikasi WHERE mahasiswa_id = ? AND dibaca = 0", [id]
    );
    const [[{ reservasi_aktif }]] = await db.query(
      "SELECT COUNT(*) as reservasi_aktif FROM reservasi WHERE mahasiswa_id = ? AND status = 'aktif'", [id]
    );

    // Kunjungan terakhir
    const [kunjungan] = await db.query(
      "SELECT tanggal FROM rekam_medis WHERE mahasiswa_id = ? ORDER BY tanggal DESC LIMIT 1", [id]
    );
    const kunjungan_terakhir = kunjungan.length > 0
      ? new Date(kunjungan[0].tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";

    return res.json({
      success: true,
      data: {
        total_rekam_medis,
        total_sks,
        sks_terverifikasi,
        sks_pending,
        notifikasi_belum_dibaca,
        reservasi_aktif,
        kunjungan_terakhir,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// POST /push-token
exports.savePushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token tidak boleh kosong" });
    }
    await db.query("UPDATE mahasiswa SET push_token = ? WHERE id = ?", [token, req.user.id]);
    return res.json({ success: true, message: "Push token tersimpan" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};
