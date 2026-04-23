CREATE DATABASE IF NOT EXISTS medical_blockchain;
USE medical_blockchain;

CREATE TABLE IF NOT EXISTS dokter (
  id INT(11) NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  spesialis VARCHAR(255) DEFAULT NULL,
  telepon VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS pasien (
  id INT(11) NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  nim VARCHAR(20) DEFAULT NULL,
  alamat TEXT DEFAULT NULL,
  fakultas VARCHAR(255) DEFAULT NULL,
  jurusan VARCHAR(255) DEFAULT NULL,
  telp VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  riwayat TEXT DEFAULT '-',
  status_aktif VARCHAR(50) DEFAULT '-',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  photo VARCHAR(255) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','akademik','mahasiswa','dokter') NOT NULL DEFAULT 'mahasiswa',
  is_verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,
  push_token TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mahasiswa_profiles (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  nim VARCHAR(20) NOT NULL,
  fakultas VARCHAR(255) DEFAULT NULL,
  jurusan VARCHAR(255) DEFAULT NULL,
  angkatan INT(11) DEFAULT NULL,
  semester INT(11) DEFAULT 1,
  tanggal_lahir DATE DEFAULT NULL,
  jenis_kelamin ENUM('Laki-laki','Perempuan') DEFAULT NULL,
  alamat TEXT DEFAULT NULL,
  riwayat TEXT DEFAULT NULL,
  status_aktif TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id),
  UNIQUE KEY nim (nim),
  CONSTRAINT mahasiswa_profiles_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS otp_tokens (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT otp_tokens_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS jadwal (
  id INT(11) NOT NULL AUTO_INCREMENT,
  pasien_id INT(11) DEFAULT NULL,
  nama VARCHAR(255) DEFAULT NULL,
  nim VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  tanggal_lahir VARCHAR(50) DEFAULT NULL,
  jenis_kelamin VARCHAR(20) DEFAULT NULL,
  alamat TEXT DEFAULT NULL,
  tipe VARCHAR(100) DEFAULT NULL,
  no INT(11) DEFAULT NULL,
  judul VARCHAR(255) DEFAULT NULL,
  keluhan TEXT DEFAULT NULL,
  tanggal DATE DEFAULT NULL,
  waktu TIME DEFAULT NULL,
  dokter VARCHAR(255) DEFAULT NULL,
  status ENUM('menunggu','disetujui','ditolak','selesai') DEFAULT 'menunggu',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pasien_id (pasien_id),
  CONSTRAINT jadwal_ibfk_1
    FOREIGN KEY (pasien_id) REFERENCES pasien(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS rekam_medis (
  id VARCHAR(36) NOT NULL,
  user_id INT(11) NOT NULL,
  dokter_id INT(11) DEFAULT NULL,
  tanggal DATE NOT NULL,
  diagnosa TEXT NOT NULL,
  keluhan TEXT DEFAULT NULL,
  tindakan TEXT DEFAULT NULL,
  catatan TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY dokter_id (dokter_id),
  CONSTRAINT rekam_medis_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT rekam_medis_ibfk_2
    FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS reservasi (
  id VARCHAR(36) NOT NULL,
  user_id INT(11) DEFAULT NULL,
  nama_pasien VARCHAR(255) DEFAULT NULL,
  email_pasien VARCHAR(255) DEFAULT NULL,
  nim_pasien VARCHAR(20) DEFAULT NULL,
  tipe ENUM('Pasien Lama','Pasien Baru') DEFAULT 'Pasien Baru',
  nomor_antrian INT(11) DEFAULT NULL,
  tanggal DATE NOT NULL,
  jam TIME NOT NULL,
  keluhan TEXT DEFAULT NULL,
  dokter_id INT(11) DEFAULT NULL,
  status ENUM('aktif','disetujui','selesai','dibatalkan','ditolak') DEFAULT 'aktif',
  catatan TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY dokter_id (dokter_id),
  CONSTRAINT reservasi_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT reservasi_ibfk_2
    FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS notifikasi (
  id VARCHAR(36) NOT NULL,
  user_id INT(11) NOT NULL,
  judul VARCHAR(255) NOT NULL,
  pesan TEXT NOT NULL,
  tipe ENUM('info','success','warning') DEFAULT 'info',
  dibaca TINYINT(1) DEFAULT 0,
  sks_id VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT notifikasi_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS surat_sakit (
  id VARCHAR(36) NOT NULL,
  user_id INT(11) NOT NULL,
  rekam_medis_id VARCHAR(36) DEFAULT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  keterangan TEXT DEFAULT NULL,
  status ENUM('pending','terverifikasi','ditolak') DEFAULT 'pending',
  hash_blockchain VARCHAR(255) DEFAULT NULL,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  verified_by INT(11) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY rekam_medis_id (rekam_medis_id),
  KEY verified_by (verified_by),
  CONSTRAINT surat_sakit_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT surat_sakit_ibfk_2
    FOREIGN KEY (rekam_medis_id) REFERENCES rekam_medis(id) ON DELETE SET NULL,
  CONSTRAINT surat_sakit_ibfk_3
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;