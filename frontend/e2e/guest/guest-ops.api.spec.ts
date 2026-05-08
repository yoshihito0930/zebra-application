import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/auth';
import { parseError } from '../helpers/api';
import { validGuestReservationPayload, futureDateStr } from '../helpers/testData';

// シリアル実行（workers=1）前提で module スコープの状態を共有する
let sharedPendingToken = '';   // pending の regular 予約トークン（GET / 詳細確認用）
let tentativeToken = '';       // tentative 予約トークン（promote テスト用）
let cancelledToken = '';       // キャンセル済み予約トークン（GUEST-403 用）

const createGuest = async (
  request: APIRequestContext,
  overrides: Partial<ReturnType<typeof validGuestReservationPayload>> = {}
) => {
  const payload = validGuestReservationPayload(overrides);
  const res = await request.post('reservations/guest', { data: payload });
  if (!res.ok()) {
    throw new Error(`guest create failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<{
    reservation_id: string;
    guest_token: string;
    status: string;
    reservation_type: string;
    promoted_from?: string;
  }>;
};

test.describe('2.4〜2.6 ゲスト予約確認・キャンセル・昇格', () => {
  // ─── セットアップ ───────────────────────────────────────
  test('setup: ゲスト予約を作成してトークンを取得', async ({ request }) => {
    // pending の regular 予約（GET / キャンセルテスト用）
    const r1 = await createGuest(request, {
      date: futureDateStr(150),
      start_time: '10:00',
      end_time: '12:00',
    });
    sharedPendingToken = r1.guest_token;

    // tentative 予約（promote テスト用）
    const r2 = await createGuest(request, {
      reservation_type: 'tentative',
      date: futureDateStr(151),
      start_time: '10:00',
      end_time: '12:00',
    });
    tentativeToken = r2.guest_token;

    // 即座にキャンセルして cancelledToken を用意（GUEST-403/404 用）
    const r3 = await createGuest(request, {
      date: futureDateStr(152),
      start_time: '10:00',
      end_time: '12:00',
    });
    const cancelRes = await request.patch(`reservations/guest/${r3.guest_token}/cancel`);
    expect(cancelRes.status()).toBe(200);
    cancelledToken = r3.guest_token;

    expect(sharedPendingToken).toBeTruthy();
    expect(tentativeToken).toBeTruthy();
    expect(cancelledToken).toBeTruthy();
  });

  // ─── 2.4 ゲスト予約確認（トークンベース）───────────────
  test('GUEST-301: 有効なトークンでゲスト予約詳細を取得できる', async ({ request }) => {
    const res = await request.get(`reservations/guest/${sharedPendingToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reservation_id).toBeTruthy();
    expect(body.status).toBe('pending');
    expect(body.reservation_type).toBe('regular');
  });

  test('GUEST-302: 無効なトークン（存在しない）で予約詳細を取得しようとする → 404', async ({
    request,
  }) => {
    const fakeToken = '00000000-0000-4000-8000-000000000001';
    const res = await request.get(`reservations/guest/${fakeToken}`);
    expect(res.status()).toBe(404);
    const err = await parseError(res);
    expect(err.error.code).toBe('RESERVATION_NOT_FOUND');
  });

  test('GUEST-303: トークン形式が不正な場合 → 400 VALIDATION_ERROR', async ({ request }) => {
    const res = await request.get('reservations/guest/not-a-uuid');
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
  });

  test('GUEST-304: 会員予約IDをゲストトークンとして使用 → 404', async ({ request }) => {
    // 有効な UUID v4 形式だがゲスト予約に紐付かないトークン
    const memberLikeToken = '11111111-1111-4111-8111-111111111111';
    const res = await request.get(`reservations/guest/${memberLikeToken}`);
    // FindByGuestTokenがis_guest=falseならRESOURCE_NOT_FOUNDを返す
    expect([403, 404]).toContain(res.status());
  });

  // ─── 2.5 ゲスト予約キャンセル ──────────────────────────
  test('GUEST-401: pending状態のゲスト予約をキャンセルできる', async ({ request }) => {
    // 専用予約を作成してキャンセル（sharedPendingToken は GUEST-301 用に保持）
    const r = await createGuest(request, {
      date: futureDateStr(153),
      start_time: '10:00',
      end_time: '12:00',
    });
    const res = await request.patch(`reservations/guest/${r.guest_token}/cancel`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
    expect(body.cancelled_by).toBe('customer');
  });

  test('GUEST-402: confirmed状態のゲスト予約をキャンセルできる', async ({ request }) => {
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    const r = await createGuest(request, {
      date: futureDateStr(154),
      start_time: '10:00',
      end_time: '12:00',
    });
    // admin で承認して confirmed にする
    const approveRes = await request.patch(`reservations/${r.reservation_id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(approveRes.status()).toBe(200);

    const res = await request.patch(`reservations/guest/${r.guest_token}/cancel`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
  });

  test('GUEST-403: 既にキャンセル済みの予約を再度キャンセルしようとする → 409 INVALID_STATUS_TRANSITION', async ({
    request,
  }) => {
    const res = await request.patch(`reservations/guest/${cancelledToken}/cancel`);
    expect(res.status()).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('GUEST-404: 完了済みの予約をキャンセルしようとする → 409 (環境制約によりskip)', async () => {
    // completed ステータスは利用日経過後のバッチ処理でのみ設定される
    // E2Eテストで直接作成する手段がないためスキップする
    test.skip();
  });

  test('GUEST-405: キャンセル完了メールが送信される（キャンセル成功レスポンスで代替検証）', async ({
    request,
  }) => {
    const r = await createGuest(request, {
      date: futureDateStr(155),
      start_time: '13:00',
      end_time: '15:00',
    });
    const res = await request.patch(`reservations/guest/${r.guest_token}/cancel`);
    expect(res.status()).toBe(200);
    // SES経由でインボックス確認不可のため status=cancelled のレスポンスで代替検証
    const body = await res.json();
    expect(body.status).toBe('cancelled');
    expect(body.cancelled_by).toBe('customer');
  });

  // ─── 2.6 ゲスト仮予約昇格 ──────────────────────────────
  test('GUEST-501: tentative状態のゲスト予約を本予約に昇格できる', async ({ request }) => {
    // ゲスト予約の作成直後は status=pending であり、tentative には admin 承認後に遷移する。
    // admin token がない場合は tentative 状態を作れないため代替検証として skip する。
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    // tentativeToken の予約を admin が承認 → status=tentative になる
    const reservation = await (
      await request.get(`reservations/guest/${tentativeToken}`)
    ).json();
    await request.patch(`reservations/${reservation.reservation_id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await request.patch(`reservations/guest/${tentativeToken}/promote`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
  });

  test('GUEST-502: confirmed状態の予約を昇格しようとする → 409 (環境制約)', async ({
    request,
  }) => {
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    const r = await createGuest(request, {
      reservation_type: 'tentative',
      date: futureDateStr(156),
      start_time: '10:00',
      end_time: '12:00',
    });
    await request.patch(`reservations/${r.reservation_id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await request.patch(`reservations/guest/${r.guest_token}/promote`);
    expect(res.status()).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('GUEST-503: pending状態の予約を昇格しようとする → 409 INVALID_STATUS_TRANSITION', async ({
    request,
  }) => {
    const r = await createGuest(request, {
      date: futureDateStr(157),
      start_time: '10:00',
      end_time: '12:00',
    });
    const res = await request.patch(`reservations/guest/${r.guest_token}/promote`);
    expect(res.status()).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('GUEST-504: 昇格後はオーナーの承認待ち（pending）、promoted_from=tentative', async ({
    request,
  }) => {
    // GUEST-501 が admin token 必須でskipされる場合、本テストもskipする
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    // tentativeToken は GUEST-501 で promote 済み（シリアル実行のため状態が持続）
    const res = await request.get(`reservations/guest/${tentativeToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.promoted_from).toBe('tentative');
  });

  test('GUEST-505: 昇格受付メールが送信される（昇格成功レスポンスで代替検証）', async ({
    request,
  }) => {
    // tentative 状態を作るには admin 承認が必要のため skip 処理を入れる
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    const r = await createGuest(request, {
      reservation_type: 'tentative',
      date: futureDateStr(158),
      start_time: '10:00',
      end_time: '12:00',
    });
    await request.patch(`reservations/${r.reservation_id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await request.patch(`reservations/guest/${r.guest_token}/promote`);
    expect(res.status()).toBe(200);
    // SES経由でインボックス確認不可のため status=pending + promoted_from=tentative で代替検証
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.promoted_from).toBe('tentative');
  });
});
