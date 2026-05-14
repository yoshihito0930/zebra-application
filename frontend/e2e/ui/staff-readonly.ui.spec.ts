import { test, expect } from '@playwright/test';
import { getSharedStaff } from '../fixtures/auth';
import { uiLogin } from './helpers/ui-login';
import { getApiRequest } from './helpers/api-context';

test.describe('UI-STAFF readonly view', () => {
  test.beforeEach(async () => {
    test.setTimeout(60_000);
  });

  test('UI-STAFF-001 staff can view /staff/calendar', async ({ page }) => {
    const apiRequest = await getApiRequest();
    const sharedStaff = await getSharedStaff(apiRequest);

    await uiLogin(page, sharedStaff.payload.email, sharedStaff.payload.password);
    await expect(page).toHaveURL(/\/staff\/dashboard/);

    await page.goto('/staff/calendar');
    await expect(
      page.getByRole('heading', { name: '予約カレンダー' })
    ).toBeVisible({ timeout: 20_000 });

    // staff は予約管理画面の「承認・拒否」 UI を持たない (READ ONLY) 確認
    await expect(page.getByRole('button', { name: '承認・拒否' })).toHaveCount(0);
  });
});
