import { test, expect } from '@playwright/test';
import { getSharedCustomer } from '../fixtures/auth';
import { createReservationApi } from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';
import { uiLogin } from './helpers/ui-login';
import { getApiRequest } from './helpers/api-context';

test.describe('UI-CUSTOMER happy path', () => {
  test.beforeEach(async () => {
    test.setTimeout(60_000);
  });

  test('UI-CUSTOMER-001 login → calendar → reservations → detail', async ({ page }) => {
    const apiRequest = await getApiRequest();
    const sharedCustomer = await getSharedCustomer(apiRequest);

    // (a) API で 1 件 pending 予約を事前作成。
    // customer 一覧テーブルには reservation_id 列が無いので、日付で行を特定する。
    // adminFutureDateStr はプロセス起動毎にランダム offset を加えるためテスト内で衝突しにくい。
    const dateStr = adminFutureDateStr(45);
    const createRes = await createReservationApi(
      apiRequest,
      sharedCustomer.accessToken,
      validReservationPayload({ date: dateStr })
    );
    expect(
      createRes.status(),
      `precondition: create reservation must succeed: ${await createRes.text()}`
    ).toBe(201);
    const created = await createRes.json();
    const reservationId: string = created.reservation_id;

    // ja-JP 日付フォーマット (例: "2026年9月29日(火)") に変換
    // ReservationsPage.tsx:50-58 で toLocaleDateString('ja-JP',...) を使用
    const formattedDate = new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });

    // (b) UI ログイン → /customer/calendar
    await uiLogin(page, sharedCustomer.payload.email, sharedCustomer.payload.password);
    await expect(page).toHaveURL(/\/customer\/calendar/);
    await expect(
      page.getByRole('heading', { name: '予約カレンダー' })
    ).toBeVisible({ timeout: 20_000 });

    // (c) /customer/reservations 一覧表示
    await page.goto('/customer/reservations');
    await expect(
      page.getByRole('heading', { name: '予約一覧' })
    ).toBeVisible({ timeout: 20_000 });

    // 作成した予約を日付で特定 → 詳細ボタンクリック (今後の予約セクションに入るはず)
    const row = page.locator('tr', { hasText: formattedDate }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole('button', { name: '詳細を見る' }).click();

    // (d) 予約詳細表示
    await expect(page).toHaveURL(new RegExp(`/customer/reservations/${reservationId}`));
    await expect(
      page.getByRole('heading', { name: '予約詳細' })
    ).toBeVisible({ timeout: 20_000 });
  });
});
