import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  approveReservationApi,
  cancelReservationApi,
  createReservationApi,
  getReservationApi,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 440..449 に分散する。
// admin の cancel は customer 用 cancelReservationApi を admin トークンで再利用 (handler が role から cancelled_by を決定)。

test.describe('4.5 予約キャンセル (管理者側, UC-208)', () => {
  test('ADMIN-401: 管理者が確定予約をキャンセルできる → cancelled, cancelled_by=owner', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(440),
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

    const res = await cancelReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-401 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
    expect(body.cancelled_by).toBe('owner');
  });

  test('ADMIN-402: 管理者がpending予約をキャンセルできる', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(441),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();

    const res = await cancelReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-402 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
    expect(body.cancelled_by).toBe('owner');

    // GET で再確認
    const getRes = await getReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    const detail = await getRes.json();
    expect(detail.cancelled_by).toBe('owner');
  });
});
