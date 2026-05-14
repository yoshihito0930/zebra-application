import { test, expect } from '@playwright/test';
import { getSharedAdmin, getSharedCustomer } from '../fixtures/auth';
import { createReservationApi } from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';
import { uiLogin } from './helpers/ui-login';
import { getApiRequest } from './helpers/api-context';

test.describe('UI-ADMIN approval flow', () => {
  test.beforeEach(async () => {
    test.setTimeout(60_000);
  });

  test('UI-ADMIN-001 admin approves a pending reservation', async ({ page }) => {
    const apiRequest = await getApiRequest();
    const sharedCustomer = await getSharedCustomer(apiRequest);
    const sharedAdmin = await getSharedAdmin(apiRequest);

    // (a) customer の token で pending 予約を作成 (admin のフィルタで pending を選んで対象行を探す)
    const createRes = await createReservationApi(
      apiRequest,
      sharedCustomer.accessToken,
      validReservationPayload({ date: adminFutureDateStr(60) })
    );
    expect(
      createRes.status(),
      `precondition: create reservation must succeed: ${await createRes.text()}`
    ).toBe(201);
    const created = await createRes.json();
    const reservationId: string = created.reservation_id;

    // (b) admin UI ログイン (→ /admin/dashboard へ自動遷移)
    await uiLogin(page, sharedAdmin.payload.email, sharedAdmin.payload.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // /admin/reservations に明示遷移
    await page.goto('/admin/reservations');
    await expect(
      page.getByRole('heading', { name: '予約管理' })
    ).toBeVisible({ timeout: 20_000 });

    // (c) status フィルタを「承認待ち」に変更し対象行を見つけやすくする
    await page.getByRole('combobox').first().selectOption('pending');

    const row = page.locator('tr', { hasText: reservationId });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // (d) 行内の承認・拒否ボタンをクリック → ダイアログ表示
    await row.getByRole('button', { name: '承認・拒否' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText('予約の承認・拒否')).toBeVisible();

    // 「承認する」ラジオはデフォルト選択。明示的に check しても idempotent
    await dialog.getByText('承認する').click();

    // (e) 「承認」ボタンクリック → 成功 toast
    await dialog.getByRole('button', { name: '承認', exact: true }).click();
    await expect(page.getByText('予約を承認しました')).toBeVisible({ timeout: 15_000 });

    // (f) フィルタを「本予約」(confirmed) に変更し、承認済みの該当予約が status=confirmed で見えることを確認。
    // 注: status フィルタを「すべて (all)」に戻すと frontend が status=all をクエリに付けてしまい
    // backend が 0 件を返すため (Bug 31, 別 issue)、ここでは confirmed フィルタで確認する。
    await page.getByRole('combobox').first().selectOption('confirmed');

    // status バッジが「本予約」に変化したことを行内で確認 (React Query 再取得待ち)
    // 種別列とステータス列の両方に「本予約」が出るため strict mode 違反を避け first() を使う。
    // 種別列は元から「本予約」なので、行が confirmed フィルタで現れた = ステータスが本予約に遷移済み、と判定できる。
    await expect(async () => {
      const refreshedRow = page.locator('tr', { hasText: reservationId });
      await expect(refreshedRow).toBeVisible();
      await expect(refreshedRow.getByText('本予約').first()).toBeVisible();
    }).toPass({ timeout: 30_000 });
  });
});
