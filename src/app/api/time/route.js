/**
 * Server Time API
 * GET /api/time - Get server timestamp for timer synchronization
 */

import { apiResponse } from '@/lib/utils';

export async function GET() {
  return apiResponse({
    server_time: new Date().toISOString(),
    timestamp: Date.now(),
  });
}
