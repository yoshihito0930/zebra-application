import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createReservationApi,
  listAdminReservationsApi,
  getReservationApi,
  approveReservationApi,
  updateReservationApi,
  createPlanApi,
  parseError,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// Category 7 (スタッフ・閲覧のみ) — STAFF-001..005
// adminFutureDateStr の baseOffset は 600..609 に分散 (admin 400 番台, blocked_slot 500 番台と衝突回避)

test.describe('7.1 予約閲覧 / 認可境界 (UC-301, UC-302)', () => {
  test('STAFF-001: スタッフが所属スタジオの予約一覧を取得できる', async ({
    request,
    sharedCustomer,
    sharedStaff,
  }) => {
    // seed: 期間内に 1 件の予約を customer で作成
    const date = adminFutureDateStr(600);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    expect(createRes.status(), `seed reservation: ${await createRes.text()}`).toBe(201);

    const res = await listAdminReservationsApi(request, sharedStaff.accessToken, {
      studio_id: sharedStaff.studioID,
      start_date: adminFutureDateStr(595),
      end_date: adminFutureDateStr(605),
    });
    expect(res.status(), `STAFF-001 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reservations)).toBe(true);
    // seed した予約が含まれること (閲覧権限が機能している証拠)
    const seeded = body.reservations.find((r: { date: string }) => r.date === date);
    expect(seeded).toBeTruthy();
  });

  test('STAFF-002: スタッフが予約詳細を取得できる', async ({
    request,
    sharedCustomer,
    sharedStaff,
  }) => {
    const date = adminFutureDateStr(601);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '13:00', end_time: '15:00' })
    );
    expect(createRes.status(), `seed reservation: ${await createRes.text()}`).toBe(201);
    const created = await createRes.json();

    const res = await getReservationApi(
      request,
      sharedStaff.accessToken,
      created.reservation_id
    );
    expect(res.status(), `STAFF-002 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.reservation_id).toBe(created.reservation_id);
    expect(body.date).toBe(date);
  });

  test('STAFF-003: スタッフが予約を承認しようとする → 403 FORBIDDEN_ROLE', async ({
    request,
    sharedCustomer,
    sharedStaff,
  }) => {
    const date = adminFutureDateStr(602);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    expect(createRes.status(), `seed reservation: ${await createRes.text()}`).toBe(201);
    const created = await createRes.json();

    const res = await approveReservationApi(
      request,
      sharedStaff.accessToken,
      created.reservation_id
    );
    expect(res.status(), `STAFF-003 body: ${await res.text()}`).toBe(403);
    const err = await parseError(res);
    expect(err.error.code).toBe('FORBIDDEN_ROLE');
  });

  test('STAFF-004: スタッフが予約を編集しようとする → 403 FORBIDDEN_ROLE', async ({
    request,
    sharedCustomer,
    sharedStaff,
  }) => {
    const date = adminFutureDateStr(603);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    expect(createRes.status(), `seed reservation: ${await createRes.text()}`).toBe(201);
    const created = await createRes.json();

    const res = await updateReservationApi(
      request,
      sharedStaff.accessToken,
      created.reservation_id,
      { note: 'staff cannot edit' }
    );
    expect(res.status(), `STAFF-004 body: ${await res.text()}`).toBe(403);
    const err = await parseError(res);
    expect(err.error.code).toBe('FORBIDDEN_ROLE');
  });

  test('STAFF-005: スタッフがプランを作成しようとする → 403 FORBIDDEN_ROLE', async ({
    request,
    sharedStaff,
  }) => {
    const res = await createPlanApi(request, sharedStaff.accessToken, {
      plan_name: 'STAFF-005 試行プラン',
      description: 'staff should not be able to create',
      price: 10000,
      tax_rate: 0.1,
    });
    expect(res.status(), `STAFF-005 body: ${await res.text()}`).toBe(403);
    const err = await parseError(res);
    expect(err.error.code).toBe('FORBIDDEN_ROLE');
  });
});
