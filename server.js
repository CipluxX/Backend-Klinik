require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 8000;

// ── Middleware (urutan ini penting!) ──────────────────────────
// Ganti app.use(helmet()); dengan ini:
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files untuk uploads foto ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiter ──────────────────────────────────────────────
app.use('/api/web/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' }
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' }
}));

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Medical Blockchain API berjalan",
    version: "1.0.0",
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});