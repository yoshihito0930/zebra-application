import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createReservationApi,
  cancelReservationApi,
  parseError,
} from '../helpers/api';
import { validReservationPayload, futureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 260..270 に分散する。

test.describe('3.4 予約キャンセル (UC-105)', () => {
  test('CUSTOMER-301: pending 状態の予約をキャンセルできる', async ({
    request,
    sharedCustomer,
  }) => {
    const payload = validReservationPayload({
      date: futureDateStr(260),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id } = await createRes.json();

    const cancelRes = await cancelReservationApi(
      request,
      sharedCustomer.accessToken,
      reservation_id
    );
    expect(cancelRes.status(), `CUSTOMER-301 body: ${await cancelRes.text()}`).toBe(200);
    const body = await cancelRes.json();
    expect(body.reservation_id).toBe(reservation_id);
    expect(body.status).toBe('cancelled');
    expect(body.cancelled_by).toBe('customer');
    expect(body.cancelled_at).toBeTruthy();
  });

  test.skip('CUSTOMER-302: confirmed 状態の予約をキャンセルできる', async () => {
    // confirmed には admin 承認が必須。会員のみのフローで confirmed に到達できない。
    // GUEST-501 同根 — Category 4 (admin) で再検証する。
  });

  test.skip('CUSTOMER-303: tentative 状態の予約をキャンセルできる', async () => {
    // tentative には admin 承認が必要。CUSTOMER-302 と同根。
  });

  test('CUSTOMER-304: 既にキャンセル済みの予約を再度キャンセルしようとする', async ({
    request,
    sharedCustomer,
  }) => {
    const payload = validReservationPayload({
      date: futureDateStr(263),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id } = await createRes.json();

    // 1 回目: 成功
    const first = await cancelReservationApi(request, sharedCustomer.accessToken, reservation_id);
    expect(first.status()).toBe(200);

    // 2 回目: 409 INVALID_STATUS_TRANSITION
    const second = await cancelReservationApi(request, sharedCustomer.accessToken, reservation_id);
    expect(second.status(), `CUSTOMER-304 body: ${await second.text()}`).toBe(409);
    const err = await parseError(second);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test.skip('CUSTOMER-305: 完了済み (completed) の予約をキャンセルしようとする', async () => {
    // completed はバッチ処理 (利用日経過後) でしか到達しない。
    // 環境制約により E2E で生成不可 — Category 9 のバッチ処理経由で再検証。
  });

  test('CUSTOMER-306: 他ユーザーの予約をキャンセルしようとする', async ({
    request,
    sharedCustomer,
    sharedCustomer2,
  }) => {
    const payload = validReservationPayload({
      date: futureDateStr(265),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer2.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id: otherID } = await createRes.json();

    const cancelRes = await cancelReservationApi(request, sharedCustomer.accessToken, otherID);
    expect(cancelRes.status(), `CUSTOMER-306 body: ${await cancelRes.text()}`).toBe(403);
    const err = await parseError(cancelRes);
    expect(err.error.code).toBe('FORBIDDEN_RESOURCE');
  });
});
