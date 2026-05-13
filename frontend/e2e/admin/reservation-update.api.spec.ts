import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  approveReservationApi,
  cancelReservationApi,
  createReservationApi,
  getReservationApi,
  parseError,
  updateReservationApi,
} from '../helpers/api';
import { validReservationPayload, adminFutureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 430..439 に分散する。

test.describe('4.4 予約編集 (UC-209)', () => {
  test('ADMIN-301: confirmed状態の予約の日時を変更できる', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const date = adminFutureDateStr(430);
    const newDate = adminFutureDateStr(431);
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    const created = await createRes.json();
    await approveReservationApi(request, sharedAdmin.accessToken, created.reservation_id);

    const res = await updateReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id,
      { date: newDate, start_time: '13:00', end_time: '15:00' }
    );
    expect(res.status(), `ADMIN-301 body: ${await res.text()}`).toBe(200);
    const body = await res.json();
    expect(body.date).toBe(newDate);
    expect(body.start_time).toBe('13:00');
    expect(body.end_time).toBe('15:00');

    // GET でも永続化を確認
    const getRes = await getReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    const detail = await getRes.json();
    expect(detail.date).toBe(newDate);
    expect(detail.start_time).toBe('13:00');
    expect(detail.end_time).toBe('15:00');
  });

  test('ADMIN-302: 予約のnoteを更新できる', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(432),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();

    const newNote = '管理者によるメモ追加 2026-05-12';
    const res = await updateReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id,
      { note: newNote }
    );
    expect(res.status(), `ADMIN-302 body: ${await res.text()}`).toBe(200);

    const getRes = await getReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id
    );
    const detail = await getRes.json();
    expect(detail.note).toBe(newNote);
  });

  test('ADMIN-303: 日時変更時に重複チェックが行われる', async ({
    request,
    sharedCustomer,
    sharedCustomer2,
    sharedAdmin,
  }) => {
    const date = adminFutureDateStr(433);
    // 第1予約 (固定スロット)
    const firstRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({ date, start_time: '10:00', end_time: '12:00' })
    );
    const first = await firstRes.json();
    await approveReservationApi(request, sharedAdmin.accessToken, first.reservation_id);

    // 第2予約 (異なるスロット)
    const secondRes = await createReservationApi(
      request,
      sharedCustomer2.accessToken,
      validReservationPayload({ date, start_time: '14:00', end_time: '16:00' })
    );
    const second = await secondRes.json();
    await approveReservationApi(request, sharedAdmin.accessToken, second.reservation_id);

    // 第2を第1の時間帯に寄せる → 409
    const res = await updateReservationApi(
      request,
      sharedAdmin.accessToken,
      second.reservation_id,
      { start_time: '10:00', end_time: '12:00' }
    );
    expect(res.status(), `ADMIN-303 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('RESERVATION_CONFLICT');
  });

  test('ADMIN-304: cancelled状態の予約を編集しようとする', async ({
    request,
    sharedCustomer,
    sharedAdmin,
  }) => {
    const createRes = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        date: adminFutureDateStr(434),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    const created = await createRes.json();
    await cancelReservationApi(request, sharedCustomer.accessToken, created.reservation_id);

    const res = await updateReservationApi(
      request,
      sharedAdmin.accessToken,
      created.reservation_id,
      { note: 'update on cancelled' }
    );
    expect(res.status(), `ADMIN-304 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test.skip('ADMIN-305: completed状態の予約を編集しようとする', async () => {
    // completed ステータスはバッチ処理 (利用日経過後) でのみ到達する。
    // Category 9 のバッチ処理経由で再検証する。
  });
});
