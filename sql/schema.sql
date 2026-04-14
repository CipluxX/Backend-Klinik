-- ============================================================
-- DATABASE: medical_blockchain
-- ============================================================

CREATE DATABASE IF NOT EXISTS medical_blockchain;
USE medical_blockchain;

-- Tabel mahasiswa
CREATE TABLE IF NOT EXISTS mahasiswa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  nim VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  telepon VARCHAR(20),
  fakultas VARCHAR(255),
  jurusan VARCHAR(255),
  angkatan INT,
  semester INT DEFAULT 1,
  password VARCHAR(255) NOT NULL,
  push_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel rekam medis
CREATE TABLE IF NOT EXISTS rekam_medis (
  id VARCHAR(36) PRIMARY KEY,
  mahasiswa_id INT NOT NULL,
  tanggal DATE NOT NULL,
  diagnosa TEXT NOT NULL,
  keluhan TEXT,
  tindakan TEXT,
  dokter VARCHAR(255),
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
);

-- Tabel surat keterangan sakit
CREATE TABLE IF NOT EXISTS surat_sakit (
  id VARCHAR(36) PRIMARY KEY,
  mahasiswa_id INT NOT NULL,
  rekam_medis_id VARCHAR(36),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  keterangan TEXT,
  status ENUM('pending', 'terverifikasi', 'ditolak') DEFAULT 'pending',
  hash_blockchain VARCHAR(255),
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
  FOREIGN KEY (rekam_medis_id) REFERENCES rekam_medis(id) ON DELETE SET NULL
);

-- Tabel reservasi
CREATE TABLE IF NOT EXISTS reservasi (
  id VARCHAR(36) PRIMARY KEY,
  mahasiswa_id INT NOT NULL,
  tanggal DATE NOT NULL,
  jam TIME NOT NULL,
  keluhan TEXT,
  status ENUM('aktif', 'selesai', 'dibatalkan') DEFAULT 'aktif',
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
);

-- Tabel notifikasi
CREATE TABLE IF NOT EXISTS notifikasi (
  id VARCHAR(36) PRIMARY KEY,
  mahasiswa_id INT NOT NULL,
  judul VARCHAR(255) NOT NULL,
  pesan TEXT NOT NULL,
  tipe ENUM('info', 'success', 'warning') DEFAULT 'info',
  dibaca BOOLEAN DEFAULT FALSE,
  sks_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
);

-- Data dummy mahasiswa (password: password123)
INSERT INTO mahasiswa (nama, nim, email, telepon, fakultas, jurusan, angkatan, semester, password)
VALUES (
  'Muhammad Azhar',
  '24060122120045',
  'azhar@students.undip.ac.id',
  '081234567890',
  'Fakultas Teknik',
  'Teknik Komputer',
  2022,
  6,
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);
