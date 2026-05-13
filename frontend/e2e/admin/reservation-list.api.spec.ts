import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createReservationApi,
  listAdminReservationsApi,
  parseError,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 400..409 に分散する。

test.describe('4.1 予約一覧取得 (UC-206)', () => {
  test('ADMIN-001: 管理者が所属スタジオの予約一覧を取得できる', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    // seed: 期間内に 1 件の予約を作成
    const date = adminFutureDateStr(400);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date,
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(createRes.status(), `seed reservation: ${await createRes.text()}`).toBe(201);

    const res = await listAdminReservationsApi(request, sharedAdmin.accessToken, {
      studio_id: 'studio_001',
      start_date: adminFutureDateStr(395),
      end_date: adminFutureDateStr(405),
    });
    expect(res.status(), `ADMIN-001 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reservations)).toBe(true);
    expect(body.reservations.length).toBeGreaterThan(0);
    // seed した予約が含まれること
    const seeded = body.reservations.find((r: { date: string }) => r.date === date);
    expect(seeded).toBeTruthy();
  });

  test('ADMIN-002: ステータスでフィルタリングできる (status=pending)', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const date = adminFutureDateStr(401);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    expect(createRes.status()).toBe(201);

    const res = await listAdminReservationsApi(request, sharedAdmin.accessToken, {
      studio_id: 'studio_001',
      start_date: adminFutureDateStr(395),
      end_date: adminFutureDateStr(405),
      status: 'pending',
    });
    expect(res.status(), `ADMIN-002 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    // pending のみが返ること
    for (const r of body.reservations) {
      expect(r.status).toBe('pending');
    }
  });

  test('ADMIN-003: 他スタジオの予約一覧を取得しようとする', async ({
    request,
    sharedAdmin,
  }) => {
    const res = await listAdminReservationsApi(request, sharedAdmin.accessToken, {
      studio_id: 'studio_999', // admin の studio_id (studio_001) と異なる
      start_date: adminFutureDateStr(395),
      end_date: adminFutureDateStr(405),
    });
    expect(res.status(), `ADMIN-003 body: ${await res.text()}`).toBe(403);
    const err = await parseError(res);
    expect(err.error.code).toBe('FORBIDDEN_RESOURCE');
  });

  test('ADMIN-004: 日付範囲パラメータが不正な場合', async ({ request, sharedAdmin }) => {
    // start_date が不正な形式
    const res = await listAdminReservationsApi(request, sharedAdmin.accessToken, {
      studio_id: 'studio_001',
      start_date: 'invalid-date',
      end_date: adminFutureDateStr(405),
    });
    expect([400, 422], `ADMIN-004 body: ${await res.text()}`).toContain(res.status());
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
  });
});
