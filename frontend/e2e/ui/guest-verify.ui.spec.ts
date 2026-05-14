import { test, expect } from '@playwright/test';
import { createGuestReservationApi } from '../helpers/api';
import { validGuestReservationPayload, adminFutureDateStr } from '../helpers/testData';
import { getApiRequest } from './helpers/api-context';

test.describe('UI-GUEST verify + detail', () => {
  test.beforeEach(async () => {
    test.setTimeout(60_000);
  });

  test('UI-GUEST-001 verify token → guest reservation detail', async ({ page }) => {
    const apiRequest = await getApiRequest();

    // (a) API でゲスト予約を作成して guest_token を取得
    const createRes = await createGuestReservationApi(
      apiRequest,
      validGuestReservationPayload({ date: adminFutureDateStr(75) })
    );
    expect(
      createRes.status(),
      `precondition: create guest reservation must succeed: ${await createRes.text()}`
    ).toBe(201);
    const created = await createRes.json();
    const token: string = created.guest_token;
    expect(token, 'guest_token must be present in response').toBeTruthy();

    // (b) verify 画面へ
    await page.goto('/reservations/guest/verify');
    await expect(
      page.getByRole('heading', { name: '予約確認' })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('予約確認トークン').fill(token);
    await page.getByRole('button', { name: '予約を確認' }).click();

    // (c) 詳細ページ遷移確認
    await expect(page).toHaveURL(new RegExp(`/reservations/guest/${token}$`));
    await expect(
      page.getByRole('heading', { name: '予約詳細' })
    ).toBeVisible({ timeout: 20_000 });
  });
});
