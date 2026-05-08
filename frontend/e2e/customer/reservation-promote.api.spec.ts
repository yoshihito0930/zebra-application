import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createReservationApi,
  promoteReservationApi,
  parseError,
} from '../helpers/api';
import { validReservationPayload, futureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 280..290 に分散する。

test.describe('3.5 仮予約昇格 (UC-106)', () => {
  test.skip('CUSTOMER-401: tentative 状態の予約を本予約に昇格できる', async () => {
    // 会員作成直後の仮予約は status=pending であり、 admin 承認後に tentative に遷移する。
    // admin token 不在のため tentative 状態に到達できず PromoteReservation を成功させられない。
    // GUEST-501 と同じ環境制約 — Category 4 (admin) で再検証する。
  });

  test.skip('CUSTOMER-402: confirmed 状態の予約を昇格しようとする', async () => {
    // confirmed には admin 承認が必須。CUSTOMER-401 と同根で SKIP。
  });

  test('CUSTOMER-403: pending 状態の予約を昇格しようとする', async ({
    request,
    sharedCustomer,
  }) => {
    const payload = validReservationPayload({
      reservation_type: 'tentative',
      date: futureDateStr(282),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status(), `prep create: ${await createRes.text()}`).toBe(201);
    const { reservation_id, status } = await createRes.json();
    // 作成直後は pending である (admin 承認前)
    expect(status).toBe('pending');

    const promoteRes = await promoteReservationApi(
      request,
      sharedCustomer.accessToken,
      reservation_id
    );
    expect(promoteRes.status(), `CUSTOMER-403 body: ${await promoteRes.text()}`).toBe(409);
    const err = await parseError(promoteRes);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test.skip('CUSTOMER-404: 昇格後はオーナーの承認待ち (pending) になる', async () => {
    // CUSTOMER-401 が前提。 admin token 不在のため検証不能。 GUEST-501/504/505 と同様の制約。
  });
});
