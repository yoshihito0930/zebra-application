import { request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

// ui プロジェクトでは `use.baseURL` が FRONTEND_BASE_URL (CloudFront) に固定されているため、
// テスト fixtures に渡される `request` は API ではなくフロントエンドを叩いてしまう。
// API を叩く専用のコンテキストを別途生成して使う。
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ||
  'https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/';

let _apiContext: APIRequestContext | null = null;

export async function getApiRequest(): Promise<APIRequestContext> {
  if (_apiContext) return _apiContext;
  _apiContext = await playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });
  return _apiContext;
}
