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

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  // Parse SQL statements
  const statements = schemaSql
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Ditemukan ${statements.length} perintah SQL untuk dieksekusi.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: stmt }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn(`⚠️ Pernyataan #${i + 1} dilewati atau gagal:`, data.errors?.[0]?.message || 'Unknown error');
      } else {
        console.log(`✅ Pernyataan #${i + 1}/${statements.length} selesai.`);
      }
    } catch (err) {
      console.warn(`⚠️ Gagal mengeksekusi pernyataan #${i + 1}:`, err.message);
    }
  }

  console.log('🎉 Migrasi skema Cloudflare D1 selesai!');
}

main();
