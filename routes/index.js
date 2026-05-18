const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

// ─── Controllers Mobile ──────────────────────────────────────
const authController           = require("../controllers/mobile/authController");
const profilController         = require("../controllers/mobile/profilController");
const rekamMedisController     = require("../controllers/mobile/rekamMedisController");
const suratSakitController     = require("../controllers/mobile/suratSakitController");
const reservasiController      = require("../controllers/mobile/reservasiController");
const notifikasiController     = require("../controllers/mobile/notifikasiController");
const forgotPasswordController = require("../controllers/mobile/forgotPasswordController");

// ─── Controllers Website ─────────────────────────────────────
const webAuthController             = require("../controllers/website/authController");
const webOtpController              = require("../controllers/website/otpController");
const webPasienController           = require("../controllers/website/pasienController");
const webPasienUmumController       = require("../controllers/website/pasienUmumController");
const webReservasiController        = require("../controllers/website/reservasiController");
const webUserController             = require("../controllers/website/userController");
const webMahasiswaController        = require("../controllers/website/mahasiswaController");
const webRekamMedisController       = require("../controllers/website/rekamMedisController");
const webSuratSakitController       = require("../controllers/website/suratSakitController");
const webSuratSakitUmumController   = require("../controllers/website/suratSakitUmumController");

// ═══════════════════════════════════════════════════════════════
// HELPER: emit Socket.IO event ke semua client
// ═══════════════════════════════════════════════════════════════
function emitUpdate(req, event, payload = {}) {
  const io = req.app.get("io");

  console.log("[socket emit request]", event, payload);

  if (!io) {
    console.log("[socket emit failed] io tidak ditemukan");
    return;
  }

  io.emit(event, payload);

  console.log("[socket emit success]", event);
}

// ═══════════════════════════════════════════════════════════════
// MOBILE ROUTES
// ═══════════════════════════════════════════════════════════════
router.post("/auth/login",                  authController.login);
router.post("/auth/register",               authController.register);
router.post("/auth/logout",           auth, authController.logout);
router.get ("/auth/verify-email",           authController.verifyEmail);
router.post("/auth/resend-verification",    authController.resendVerification);
router.post("/auth/forgot-password",        forgotPasswordController.requestOTP);
router.post("/auth/verify-otp",             forgotPasswordController.verifyOTP);
router.post("/auth/reset-password",         forgotPasswordController.resetPassword);

router.get ("/profil",                auth, profilController.getProfil);
router.get ("/dashboard/stats",       auth, profilController.getDashboardStats);
router.post("/push-token",            auth, profilController.savePushToken);

router.get ("/rekam-medis",           auth, rekamMedisController.getAll);
router.get ("/rekam-medis/:id",       auth, rekamMedisController.getById);

router.get ("/surat-sakit",           auth, suratSakitController.getAll);
router.get ("/surat-sakit/:id",       auth, suratSakitController.getById);

router.get ("/reservasi",             auth, reservasiController.getAll);
router.post("/reservasi",             auth, reservasiController.create);
router.put ("/reservasi/:id/batal",   auth, reservasiController.cancel);

router.get ("/notifikasi",            auth, notifikasiController.getAll);
router.put ("/notifikasi/:id/baca",   auth, notifikasiController.tandaiBaca);

// ═══════════════════════════════════════════════════════════════
// WEBSITE ROUTES
// ═══════════════════════════════════════════════════════════════

// ─── Auth Website ────────────────────────────────────────────
router.post("/web/auth/login",              webAuthController.login);
router.post("/web/auth/register",           webAuthController.register);
router.get ("/web/auth/me",           auth, webAuthController.getMe);

// ─── OTP Website ─────────────────────────────────────────────
router.post("/web/otp/send",                webOtpController.sendOtp);
router.post("/web/otp/verify",              webOtpController.verifyOtp);

// ─── Data Mahasiswa (read-only) ───────────────────────────────
router.get("/web/mahasiswa",          auth, webMahasiswaController.getAllMahasiswa);

// ─── Data Pasien Mahasiswa Website ───────────────────────────
router.get   ("/web/pasien",          auth, webPasienController.getAllPasien);
router.get   ("/web/pasien/:id",      auth, webPasienController.getPasienById);
router.post  ("/web/pasien",          auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "pasien:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webPasienController.createPasien(req, res, next);
});
router.delete("/web/pasien/:id",      auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "pasien:hapus", { id: req.params.id, timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webPasienController.deletePasien(req, res, next);
});

// ─── Data Non Mahasiswa (Pasien Umum) Website ─────────────────
router.get   ("/web/pasien-umum",          auth, webPasienUmumController.getAllPasienUmum);
router.get   ("/web/pasien-umum/:id",      auth, webPasienUmumController.getPasienUmumById);
router.post  ("/web/pasien-umum",          auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "pasien_umum:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webPasienUmumController.createPasienUmum(req, res, next);
});
router.delete("/web/pasien-umum/:id",      auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "pasien_umum:hapus", { id: req.params.id, timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webPasienUmumController.deletePasienUmum(req, res, next);
});

// ─── Rekam Medis Mahasiswa Website ───────────────────────────
router.get ("/web/rekam-medis",       auth, webRekamMedisController.getAllRekamMedis);

// ─── WRAP createRekamMedis agar emit socket setelah berhasil ──
router.post("/web/rekam-medis",       auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "rekam_medis:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webRekamMedisController.createRekamMedis(req, res, next);
});

router.get ("/web/dokter-list",       auth, webRekamMedisController.getDokterList);

// ─── Rekam Medis Non Mahasiswa Website ───────────────────────
router.get ("/web/rekam-medis-umum",  auth, webRekamMedisController.getAllRekamMedisUmum);

router.post("/web/rekam-medis-umum",  auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "rekam_medis:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webRekamMedisController.createRekamMedisUmum(req, res, next);
});

// ─── Surat Sakit Mahasiswa Website ───────────────────────────
router.get   ("/web/surat-sakit",                  auth, webSuratSakitController.getAllSuratSakit);
router.get   ("/web/surat-sakit/:id",              auth, webSuratSakitController.getSuratSakitById);
router.delete("/web/surat-sakit/:id",              auth, webSuratSakitController.deleteSuratSakit);

router.post  ("/web/surat-sakit",                  auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "surat_sakit:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webSuratSakitController.createSuratSakit(req, res, next);
});

router.patch ("/web/surat-sakit/:id/verifikasi",   auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "surat_sakit:update", { id: req.params.id, timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webSuratSakitController.verifikasiSuratSakit(req, res, next);
});

// ─── Surat Sakit Non Mahasiswa (Umum) Website ────────────────
router.get   ("/web/surat-sakit-umum",                  auth, webSuratSakitUmumController.getAllSuratSakitUmum);
router.get   ("/web/surat-sakit-umum/:id",              auth, webSuratSakitUmumController.getSuratSakitUmumById);
router.delete("/web/surat-sakit-umum/:id",              auth, webSuratSakitUmumController.deleteSuratSakitUmum);

router.post  ("/web/surat-sakit-umum",                  auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "surat_sakit:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webSuratSakitUmumController.createSuratSakitUmum(req, res, next);
});

router.patch ("/web/surat-sakit-umum/:id/verifikasi",   auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "surat_sakit:update", { id: req.params.id, timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webSuratSakitUmumController.verifikasiSuratSakitUmum(req, res, next);
});

// ─── Reservasi Website ───────────────────────────────────────
router.get   ("/web/reservasi",            auth, webReservasiController.getAllReservasi);
router.delete("/web/reservasi/:id",        auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "reservasi:update", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webReservasiController.deleteReservasi(req, res, next);
});

// createReservasi — tanpa auth (publik), emit setelah berhasil
router.post  ("/web/reservasi",            async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "reservasi:baru", { timestamp: Date.now() });
    }
    return originalJson(body);
  };
  return webReservasiController.createReservasi(req, res, next);
});

// updateStatusReservasi — emit setelah status berubah
router.patch ("/web/reservasi/:id/status", auth, async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      emitUpdate(req, "reservasi:update", {
        id: req.params.id,
        status: req.body.status,
        timestamp: Date.now(),
      });
    }
    return originalJson(body);
  };
  return webReservasiController.updateStatusReservasi(req, res, next);
});

// ─── User Website ────────────────────────────────────────────
router.get   ("/web/user/profile",         auth, webUserController.getProfile);
router.put   ("/web/user/profile",         auth, webUserController.updateProfile);
router.put   ("/web/user/password",        auth, webUserController.updatePassword);
router.post  ("/web/user/photo",           auth, upload.single("photo"), webUserController.uploadPhoto);
router.delete("/web/user/photo",           auth, webUserController.deletePhoto);

module.exports = router;