const mysql = require('mysql2/promise');
const xlsx = require('xlsx');
require('dotenv').config();

async function exportToExcel() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'medical_blockchain',
  });

  const workbook = xlsx.utils.book_new();
  const tables = ['mahasiswa', 'rekam_medis', 'surat_sakit', 'reservasi', 'notifikasi', 'otp_tokens'];

  for (const table of tables) {
    const [rows] = await db.query(`SELECT * FROM ${table}`);
    const data = rows.length > 0 ? rows : [{}];
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, table);
    console.log(`✅ ${table} (${rows.length} baris)`);
  }

  xlsx.writeFile(workbook, 'medical_blockchain_export.xlsx');
  console.log('📁 File tersimpan: medical_blockchain_export.xlsx');
  await db.end();
}

exportToExcel().catch(console.error);