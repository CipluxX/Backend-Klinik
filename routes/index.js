const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const authController = require("../controllers/mobile/authController");
const profilController = require("../controllers/mobile/profilController");
const rekamMedisController = require("../controllers/mobile/rekamMedisController");
const suratSakitController = require("../controllers/mobile/suratSakitController");
const reservasiController = require("../controllers/mobile/reservasiController");
const notifikasiController = require("../controllers/mobile/notifikasiController");
const forgotPasswordController = require("../controllers/mobile/forgotPasswordController");


// ─── Auth (public) ───────────────────────────────────────────
router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
router.post("/auth/logout", auth, authController.logout);

// ─── Profil & Dashboard ──────────────────────────────────────
router.get("/profil", auth, profilController.getProfil);
router.get("/dashboard/stats", auth, profilController.getDashboardStats);
router.post("/push-token", auth, profilController.savePushToken);

// ─── Rekam Medis ─────────────────────────────────────────────
router.get("/rekam-medis", auth, rekamMedisController.getAll);
router.get("/rekam-medis/:id", auth, rekamMedisController.getById);

// ─── Surat Sakit ─────────────────────────────────────────────
router.get("/surat-sakit", auth, suratSakitController.getAll);
router.get("/surat-sakit/:id", auth, suratSakitController.getById);

// ─── Reservasi ───────────────────────────────────────────────
router.get("/reservasi", auth, reservasiController.getAll);
router.post("/reservasi", auth, reservasiController.create);
router.put("/reservasi/:id/batal", auth, reservasiController.cancel);

// ─── Notifikasi ──────────────────────────────────────────────
router.get("/notifikasi", auth, notifikasiController.getAll);
router.put("/notifikasi/:id/baca", auth, notifikasiController.tandaiBaca);

router.post("/auth/forgot-password", forgotPasswordController.requestOTP);
router.post("/auth/verify-otp", forgotPasswordController.verifyOTP);
router.post("/auth/reset-password", forgotPasswordController.resetPassword);

// Tambahkan 2 route ini di bagian auth
router.get("/auth/verify-email", authController.verifyEmail);
router.post("/auth/resend-verification", authController.resendVerification);

module.exports = router;
