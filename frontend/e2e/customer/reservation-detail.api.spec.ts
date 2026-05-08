import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { createReservationApi, getReservationApi, parseError } from '../helpers/api';
import { validReservationPayload, futureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 250..255 に分散する。

test.describe('3.3 予約詳細取得 (UC-104)', () => {
  test('CUSTOMER-201: 自分の予約詳細を取得できる', async ({ request, sharedCustomer }) => {
    const payload = validReservationPayload({
      date: futureDateStr(250),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id } = await createRes.json();

    const getRes = await getReservationApi(request, sharedCustomer.accessToken, reservation_id);
    expect(getRes.status(), `CUSTOMER-201 body: ${await getRes.text()}`).toBe(200);
    const detail = await getRes.json();
    expect(detail.reservation_id).toBe(reservation_id);
    expect(detail.studio_id).toBe('studio_001');
    expect(detail.user_id).toBeTruthy();
  });

  test('CUSTOMER-202: 他ユーザーの予約詳細を取得しようとする', async ({
    request,
    sharedCustomer,
    sharedCustomer2,
  }) => {
    // sharedCustomer2 が作成した予約を sharedCustomer が取得しようとする
    const payload = validReservationPayload({
      date: futureDateStr(251),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer2.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id: otherID } = await createRes.json();

    const getRes = await getReservationApi(request, sharedCustomer.accessToken, otherID);
    expect(getRes.status(), `CUSTOMER-202 body: ${await getRes.text()}`).toBe(403);
    const err = await parseError(getRes);
    expect(err.error.code).toBe('FORBIDDEN_RESOURCE');
  });

  test('CUSTOMER-203: 存在しない reservation_id を指定する', async ({
    request,
    sharedCustomer,
  }) => {
    const getRes = await getReservationApi(
      request,
      sharedCustomer.accessToken,
      'nonexistent_reservation_id_999'
    );
    expect(getRes.status()).toBe(404);
    const err = await parseError(getRes);
    expect(err.error.code).toBe('RESERVATION_NOT_FOUND');
  });
});
