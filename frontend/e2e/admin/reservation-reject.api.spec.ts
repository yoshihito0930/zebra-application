import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  approveReservationApi,
  createReservationApi,
  getReservationApi,
  parseError,
  rejectReservationApi,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 420..429 に分散する。

test.describe('4.3 予約拒否 (UC-204)', () => {
  test('ADMIN-201: pending状態の予約を拒否できる → cancelled, cancelled_by=owner', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(420),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await rejectReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-201 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');

    // reject response 自体に cancelled_by は含まれないため GET で再確認
    const getRes = await getReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(getRes.status()).toBe(200);
    const detail = await getRes.json();
    expect(detail.cancelled_by).toBe('owner');
    expect(detail.cancelled_at).toBeTruthy();
  });

  test.skip('ADMIN-202: 拒否理由が保存される', async () => {
    // POST /reservations/{id}/reject はリクエストボディを Unmarshal せず、
    // usecase.RejectReservation も reason 引数を取らない実装のため、
    // reject_reason を保存する経路が存在しない。
    // Bug 11 として記録 — 修正後に再検証する。
  });

  test('ADMIN-203: confirmed状態の予約を拒否しようとする', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(421),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();
    // confirmed 化
    const apRes = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(apRes.status()).toBe(200);

    const res = await rejectReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-203 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
