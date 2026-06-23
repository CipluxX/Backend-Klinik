require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const routes = require("./routes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  process.env.FRONTEND_URL,
  process.env.MONITORING_URL,
].filter(Boolean);

// ── Socket.IO Setup ───────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Simpan instance io agar bisa diakses dari controller/routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Client terhubung:", socket.id);
  console.log("🌐 Origin:", socket.handshake.headers.origin);

  socket.emit("socket:connected", {
    id: socket.id,
    timestamp: Date.now(),
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Client terputus:", socket.id, reason);
  });
});

// ── Middleware ────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Rate limiter ──────────────────────────────────────────────
app.use(
  "/api/web/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: "Terlalu banyak percobaan, coba lagi nanti",
    },
  })
);

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: "Terlalu banyak percobaan, coba lagi nanti",
    },
  })
);

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Medical Blockchain API berjalan",
    version: "1.0.0",
  });
});

// ── Test Socket.IO Endpoint ───────────────────────────────────
// Endpoint ini hanya untuk debugging. Setelah realtime terbukti jalan, boleh dihapus.
app.get("/api/socket-test", (req, res) => {
  const ioInstance = req.app.get("io");

  if (!ioInstance) {
    return res.status(500).json({
      success: false,
      message: "Socket.IO belum tersedia",
    });
  }

  console.log("🧪 Emit socket test");

  ioInstance.emit("reservasi:baru", { test: true, timestamp: Date.now() });
  ioInstance.emit("reservasi:update", { test: true, timestamp: Date.now() });
  ioInstance.emit("rekam_medis:baru", { test: true, timestamp: Date.now() });
  ioInstance.emit("surat_sakit:baru", { test: true, timestamp: Date.now() });
  ioInstance.emit("surat_sakit:update", { test: true, timestamp: Date.now() });
  ioInstance.emit("pasien:baru", { test: true, timestamp: Date.now() });
  ioInstance.emit("pasien:hapus", { test: true, timestamp: Date.now() });
  ioInstance.emit("pasien_umum:baru", { test: true, timestamp: Date.now() });
  ioInstance.emit("pasien_umum:hapus", { test: true, timestamp: Date.now() });

  return res.json({
    success: true,
    message: "Socket test emitted",
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan server",
  });
});

// ── Start server ──────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log("✅ Socket.IO aktif");
  console.log("✅ Allowed origins:", allowedOrigins);
});
