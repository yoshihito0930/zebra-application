import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  approveReservationApi,
  cancelReservationApi,
  createReservationApi,
  parseError,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 410..419 に分散する。

test.describe('4.2 予約承認 (UC-203)', () => {
  test('ADMIN-101: pending状態の本予約を承認できる → confirmed', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'regular',
        date: adminFutureDateStr(410),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-101 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('confirmed');
    expect(body.reservation_type).toBe('regular');
  });

  test('ADMIN-102: pending状態の仮予約を承認できる → tentative', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'tentative',
        date: adminFutureDateStr(411),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-102 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('tentative');
  });

  test('ADMIN-103: pending状態のロケハンを承認できる → scheduled', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'location_scout',
        date: adminFutureDateStr(412),
        start_time: '10:00',
        end_time: '12:00', // ロケハンも最低2hの実装制約に従う
      })
    );
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-103 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('scheduled');
  });

  test('ADMIN-104: pending状態の第2キープを承認できる → waitlisted', async ({
    request,
    sharedCustomer,
    sharedCustomer2,
    sharedAdmin,
  }) => {
    // primary を作成 → admin 承認で confirmed 化
    const date = adminFutureDateStr(413);
    const primaryRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'regular',
        date,
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(primaryRes.status()).toBe(201);
    const primary = await primaryRes.json();
    const apRes = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      primary.reservation_id
    );
    expect(apRes.status()).toBe(200);

    // second_keep を作成 (別 customer で primary と同一スロット)
    const skRes = await createReservationApi(
      request,
      sharedCustomer2.accessToken,
      validReservationPayload({
        reservation_type: 'second_keep',
        date,
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(skRes.status(), `second_keep create: ${await skRes.text()}`).toBe(201);
    const sk = await skRes.json();

    const res = await approveReservationApi(request, sharedAdmin.accessToken, sk.reservation_id);
    expect(res.status(), `ADMIN-104 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('waitlisted');
  });

  test('ADMIN-105: confirmed状態の予約を承認しようとする', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'regular',
        date: adminFutureDateStr(414),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();
    // 承認して confirmed 化
    await approveReservationApi(request, sharedAdmin.accessToken, created.reservation_id);
    // 再度承認 → 409
    const res = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-105 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('ADMIN-106: cancelled状態の予約を承認しようとする', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        reservation_type: 'regular',
        date: adminFutureDateStr(415),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();
    // customer 自身でキャンセル
    await cancelReservationApi(request, sharedCustomer.accessToken, created.reservation_id);
    // 承認試行 → 409
    const res = await approveReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    expect(res.status(), `ADMIN-106 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
