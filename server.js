require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // ← untuk ngrok / reverse proxy

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors());

// ─── Rate Limiter (sebelum routes) ───────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' }
});
app.use('/api/auth', authLimiter);

// ─── Body Parser ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Global Error Trap (cegah server crash) ──────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// ─── Health Check ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Medical Blockchain API berjalan",
    version: "1.0.0",
  });
});

// ─── Routes ──────────────────────────────────────────────────
app.use("/api", routes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// ─── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});