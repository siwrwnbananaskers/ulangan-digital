/**
 * Setup Cloudflare D1 Database via REST API
 * Usage: node scripts/setup-d1.js
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    console.error('❌ Error: Cloudflare credentials not set in environment.');
    console.log('Pastikan variabel berikut ada di .env.local:');
    console.log(' - CLOUDFLARE_ACCOUNT_ID');
    console.log(' - CLOUDFLARE_D1_DATABASE_ID');
    console.log(' - CLOUDFLARE_API_TOKEN');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'migrations', '001_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('🚀 Menjalankan migrasi skema ke Cloudflare D1...');

  // Split SQL by statements or send as batch
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: schemaSql }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('❌ Gagal menjalankan migrasi:', JSON.stringify(data.errors, null, 2));
      process.exit(1);
    }

    console.log('✅ Berhasil menginisialisasi skema Cloudflare D1!');
    console.log('Tabel users, soal, ujian, ujian_soal, sesi_ujian, jawaban, dan audit_log siap digunakan.');
  } catch (err) {
    console.error('❌ Terjadi kesalahan jaringan:', err.message);
    process.exit(1);
  }
}

main();
