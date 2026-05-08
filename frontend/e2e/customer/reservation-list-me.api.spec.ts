import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { createReservationApi, listMyReservationsApi } from '../helpers/api';
import { validReservationPayload, futureDateStr } from '../helpers/testData';

// 並列実行衝突を避けるため、本ファイルでは futureDateStr の N を 240..245 に分散する。

test.describe('3.2 予約一覧取得 (UC-104)', () => {
  test('CUSTOMER-101: 自分の予約一覧を取得できる', async ({ request, sharedCustomer }) => {
    // 1 件作成しておき、一覧に含まれることを確認する
    const payload = validReservationPayload({
      date: futureDateStr(240),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status(), `prep create: ${await createRes.text()}`).toBe(201);
    const { reservation_id } = await createRes.json();

    const listRes = await listMyReservationsApi(request, sharedCustomer.accessToken);
    expect(listRes.status(), `CUSTOMER-101 body: ${await listRes.text()}`).toBe(200);
    const body = await listRes.json();
    expect(Array.isArray(body.reservations)).toBe(true);
    const ids: string[] = body.reservations.map((r: { reservation_id: string }) => r.reservation_id);
    expect(ids).toContain(reservation_id);
  });

  test('CUSTOMER-102: ステータス (pending) でフィルタリングできる', async ({
    request,
    sharedCustomer,
  }) => {
    // 1 件作成 (pending) → status=pending フィルタで取得できる
    const payload = validReservationPayload({
      date: futureDateStr(241),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer.accessToken, payload);
    expect(createRes.status()).toBe(201);
    const { reservation_id } = await createRes.json();

    const listRes = await listMyReservationsApi(request, sharedCustomer.accessToken, 'pending');
    expect(listRes.status(), `CUSTOMER-102 body: ${await listRes.text()}`).toBe(200);
    const body = await listRes.json();
    const items: Array<{ reservation_id: string; status: string }> = body.reservations;
    expect(items.some((r) => r.reservation_id === reservation_id)).toBe(true);
    // すべて pending であること
    for (const r of items) {
      expect(r.status).toBe('pending');
    }
  });

  test('CUSTOMER-103: 他ユーザーの予約が含まれない', async ({
    request,
    sharedCustomer,
    sharedCustomer2,
  }) => {
    // sharedCustomer2 が予約を作成
    const payload = validReservationPayload({
      date: futureDateStr(243),
      start_time: '14:00',
      end_time: '16:00',
    });
    const createRes = await createReservationApi(request, sharedCustomer2.accessToken, payload);
    expect(createRes.status(), `prep create: ${await createRes.text()}`).toBe(201);
    const { reservation_id: otherID } = await createRes.json();

    // sharedCustomer の一覧には otherID が含まれないこと
    const listRes = await listMyReservationsApi(request, sharedCustomer.accessToken);
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const ids: string[] = body.reservations.map((r: { reservation_id: string }) => r.reservation_id);
    expect(ids).not.toContain(otherID);
  });
});
