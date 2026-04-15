-- ============================================================
-- DATABASE: medical_blockchain (UNIFIED)
-- Mobile + Web dalam satu schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS medical_blockchain;
USE medical_blockchain;

-- ─── 1. USERS ───────────────────────────────────────────────
-- Semua entitas login: admin, akademik, mahasiswa
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  photo VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'akademik', 'mahasiswa') NOT NULL DEFAULT 'mahasiswa',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  push_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 2. MAHASISWA PROFILES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS mahasiswa_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nim VARCHAR(20) NOT NULL UNIQUE,
  fakultas VARCHAR(255),
  jurusan VARCHAR(255),
  angkatan INT,
  semester INT DEFAULT 1,
  tanggal_lahir DATE,
  jenis_kelamin ENUM('Laki-laki', 'Perempuan'),
  alamat TEXT,
  riwayat TEXT,
  status_aktif BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── 3. OTP TOKENS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── 4. DOKTER ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dokter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  spesialis VARCHAR(255),
  telepon VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 5. REKAM MEDIS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rekam_medis (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  dokter_id INT,
  tanggal DATE NOT NULL,
  diagnosa TEXT NOT NULL,
  keluhan TEXT,
  tindakan TEXT,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE SET NULL
);

-- ─── 6. SURAT SAKIT ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surat_sakit (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  rekam_medis_id VARCHAR(36),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  keterangan TEXT,
  status ENUM('pending', 'terverifikasi', 'ditolak') DEFAULT 'pending',
  hash_blockchain VARCHAR(255),
  verified_at TIMESTAMP NULL,
  verified_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rekam_medis_id) REFERENCES rekam_medis(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── 7. RESERVASI ───────────────────────────────────────────
-- ATURAN: user_id ATAU (nama_pasien + nim_pasien) wajib diisi
-- user_id diisi   → mahasiswa booking via mobile
-- nama_pasien diisi → walk-in input manual dari web
CREATE TABLE IF NOT EXISTS reservasi (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT,
  nama_pasien VARCHAR(255),
  email_pasien VARCHAR(255),
  nim_pasien VARCHAR(20),
  tipe ENUM('Pasien Lama', 'Pasien Baru') DEFAULT 'Pasien Baru',
  nomor_antrian INT,
  tanggal DATE NOT NULL,
  jam TIME NOT NULL,
  keluhan TEXT,
  dokter_id INT,
  status ENUM('aktif', 'disetujui', 'selesai', 'dibatalkan', 'ditolak') DEFAULT 'aktif',
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE SET NULL
);

-- ─── 8. NOTIFIKASI ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifikasi (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  judul VARCHAR(255) NOT NULL,
  pesan TEXT NOT NULL,
  tipe ENUM('info', 'success', 'warning') DEFAULT 'info',
  dibaca BOOLEAN DEFAULT FALSE,
  sks_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ============================================================
-- DATA DUMMY
-- ============================================================

-- ─── Dokter ──────────────────────────────────────────────────
INSERT INTO dokter (nama, spesialis) VALUES
('dr. Budi Santoso, Sp.PD', 'Penyakit Dalam'),
('dr. Siti Aminah, M.Kes', 'Umum'),
('dr. Ahmad Fauzi', 'Umum');

-- ─── Users: admin & akademik ────────────────────────────────
INSERT INTO users (name, username, email, phone, photo, password, role, is_verified) VALUES
(
  'Salman Arya Sandytia', 'salmanars', 'aryasandytia26@gmail.com',
  '081228210230', 'photo-3-1776198650818.jpeg',
  '$2a$10$016D5YKs/Fa/FbTypbF6geqDb7DQFLX/tB.Z9Z9zEUdWJ9dZC70DS',
  'admin', TRUE
),
(
  'Salman Arya Sandytia', 'akademik', 'akademik@gmail.com',
  '081228210230', 'photo-6-1776201153760.jpeg',
  '$2a$10$e9.zRXblLnpYHM67lmuQ9OnxCt5ksDCJk9D4iLktVRdhJUiO/hroO',
  'akademik', TRUE
);

-- ─── Users: mahasiswa (password: password123) ────────────────
INSERT INTO users (name, email, phone, password, role, is_verified) VALUES
(
  'Muhammad Azhar', 'azhar@students.undip.ac.id', '081234567890',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'mahasiswa', TRUE
),
(
  'Muhammad Azhar Renaldi', 'aldiangga150@gmail.com', '081573797702',
  '$2a$10$Ojf7afri65an856i0BYfsuu9PYQH1KjzSKDpTHh5.rbsEOyHkBNca',
  'mahasiswa', TRUE
),
(
  'Shulhan Aziz', 'idiotbaka150@gmail.com', '08643973913',
  '$2a$10$TQEVyaL8RA7x.6Ph9HpPYe8Q.LwLxrdnoxhiDtb7GIdqmO10Nn.MK',
  'mahasiswa', TRUE
);

-- ─── Mahasiswa Profiles ──────────────────────────────────────
-- user_id 3 = Muhammad Azhar
-- user_id 4 = Muhammad Azhar Renaldi
-- user_id 5 = Shulhan Aziz
INSERT INTO mahasiswa_profiles (user_id, nim, fakultas, jurusan, angkatan, semester) VALUES
(3, '24060122120045', 'Fakultas Teknik', 'Teknik Komputer', 2022, 6),
(4, '21120122140121', 'Fakultas Teknik', 'Teknik Komputer', 2022, 1),
(5, '21120122130049', 'Fakultas Teknik', 'Teknik Komputer', 2022, 1);

-- ─── Rekam Medis (dummy untuk Muhammad Azhar / user_id 3) ────
INSERT INTO rekam_medis (id, user_id, dokter_id, tanggal, diagnosa, keluhan, tindakan, catatan) VALUES
(
  '147ef1d7-3249-11f1-939a-44a3bb7384f7', 3, 1, '2025-11-01',
  'Demam Berdarah Dengue (DBD)',
  'Demam tinggi, sakit kepala, nyeri otot 2 hari',
  'Pemeriksaan darah lengkap, terapi cairan, antipiretik',
  'Istirahat total 5 hari, minum air putih minimal 2 liter/hari'
),
(
  '147f1833-3249-11f1-939a-44a3bb7384f7', 3, 2, '2025-09-18',
  'Infeksi Saluran Pernafasan Atas (ISPA)',
  'Batuk berdahak, pilek, demam ringan',
  'Terapi simptomatik, obat batuk, antipiretik',
  'Istirahat 2 hari, hindari paparan debu'
),
(
  '147f1c40-3249-11f1-939a-44a3bb7384f7', 3, 3, '2025-07-26',
  'Gastroenteritis Akut',
  'Nyeri perut, mual, diare sejak pagi',
  'Terapi rehidrasi oral, antidiare, probiotik',
  'Diet lunak 3 hari, hindari makanan pedas'
),
(
  '147f1d4c-3249-11f1-939a-44a3bb7384f7', 3, 1, '2025-05-14',
  'Vertigo',
  'Pusing berputar, mual saat duduk dan berdiri',
  'Pemeriksaan neurologis, terapi Epley maneuver',
  'Hindari gerakan kepala mendadak'
);

-- ─── Surat Sakit ─────────────────────────────────────────────
INSERT INTO surat_sakit (id, user_id, rekam_medis_id, tanggal_mulai, tanggal_selesai, keterangan, status) VALUES
(
  '148ad780-3249-11f1-939a-44a3bb7384f7', 3,
  '147ef1d7-3249-11f1-939a-44a3bb7384f7',
  '2025-11-01', '2025-11-05', 'Istirahat total 5 hari', 'terverifikasi'
),
(
  '148afecc-3249-11f1-939a-44a3bb7384f7', 3,
  '147f1833-3249-11f1-939a-44a3bb7384f7',
  '2025-09-18', '2025-09-19', 'Istirahat 2 hari', 'terverifikasi'
),
(
  '148b0100-3249-11f1-939a-44a3bb7384f7', 3,
  '147f1c40-3249-11f1-939a-44a3bb7384f7',
  '2025-07-26', '2025-07-28', 'Istirahat 3 hari', 'pending'
);

-- ─── Reservasi ───────────────────────────────────────────────
-- Booking via mobile
INSERT INTO reservasi (id, user_id, tipe, tanggal, jam, keluhan, status) VALUES
(
  '148eceec-3249-11f1-939a-44a3bb7384f7',
  3, 'Pasien Lama', '2026-04-10', '09:00:00', 'Pemeriksaan rutin', 'aktif'
);

-- Walk-in via web
INSERT INTO reservasi (id, user_id, nama_pasien, email_pasien, nim_pasien, tipe, nomor_antrian, tanggal, jam, keluhan, status) VALUES
(
  'web-reservasi-001', NULL,
  'Delon Tarigan', 'salmanars2022@gmail.com', '21120122140122',
  'Pasien Baru', 1, '2026-04-12', '09:22:00', 'Asam Lambung', 'disetujui'
),
(
  'web-reservasi-002', NULL,
  'Azriel Fawwaaz', 'aryasatriarejinam29@gmail.com', '21120122140122',
  'Pasien Baru', 2, '2026-04-12', '09:33:00', 'Asam Lambung', 'ditolak'
);

-- ─── Notifikasi ──────────────────────────────────────────────
INSERT INTO notifikasi (id, user_id, judul, pesan, tipe, dibaca) VALUES
(
  '1492edfd-3249-11f1-939a-44a3bb7384f7', 3,
  'Surat Sakit Terverifikasi ✅',
  'Surat sakit Anda telah diverifikasi oleh klinik.',
  'success', FALSE
),
(
  '14931200-3249-11f1-939a-44a3bb7384f7', 3,
  'Reservasi Berhasil 📅',
  'Reservasi tanggal 10 April 2026 pukul 09.00 telah terdaftar.',
  'info', FALSE
),
(
  '14931729-3249-11f1-939a-44a3bb7384f7', 3,
  'Selamat Datang! 👋',
  'Selamat datang di MedChain UNDIP. Aplikasi rekam medis berbasis blockchain.',
  'info', TRUE
);