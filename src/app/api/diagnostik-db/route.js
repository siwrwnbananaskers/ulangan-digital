import { getDB } from '@/lib/db';
import { apiResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const databaseId = (process.env.CLOUDFLARE_D1_DATABASE_ID || '').trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

  const db = getDB();
  let d1Status = 'disconnected';
  let d1Error = null;
  let testQueryResult = null;

  if (!accountId || !databaseId || !apiToken) {
    d1Status = 'missing_env_variables';
    d1Error = 'Environment variables CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, atau CLOUDFLARE_API_TOKEN belum diatur di server.';
  } else {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: 'SELECT count(*) as total_users FROM users' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        d1Status = 'connected';
        testQueryResult = data.result?.[0]?.results || [];
      } else {
        d1Status = 'api_error';
        d1Error = data.errors || `HTTP ${res.status}`;
      }
    } catch (e) {
      d1Status = 'connection_exception';
      d1Error = e.message;
    }
  }

  return apiResponse({
    environment: process.env.NODE_ENV,
    is_vercel: !!process.env.VERCEL,
    cloudflare_config: {
      has_account_id: !!accountId,
      has_database_id: !!databaseId,
      has_api_token: !!apiToken,
      account_id_prefix: accountId ? accountId.substring(0, 6) + '...' : null,
      database_id_prefix: databaseId ? databaseId.substring(0, 6) + '...' : null,
    },
    d1_status: d1Status,
    d1_error: d1Error,
    test_query_result: testQueryResult,
  });
}
