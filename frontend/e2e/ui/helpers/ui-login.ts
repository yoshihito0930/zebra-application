import type { Page } from '@playwright/test';

// /login 画面でログインし、ロール別の遷移先 URL に着くまで待機する。
// customer → /customer/calendar, admin → /admin/dashboard, staff → /staff/dashboard
// (frontend/src/hooks/useAuth.ts:31-35)
export async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL(/\/(customer\/calendar|admin\/dashboard|staff\/dashboard)/, {
    timeout: 20_000,
  });
}
