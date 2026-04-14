require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Medical Blockchain API berjalan",
    version: "1.0.0",
  });
});

// Routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

// Di server.js
const rateLimit = require('express-rate-limit');
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // max 10 request
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' }
}));

const helmet = require('helmet');
app.use(helmet());