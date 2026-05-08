import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { parseError } from '../helpers/api';
import { validGuestReservationPayload, futureDateStr } from '../helpers/testData';

test.describe('2.3 ゲスト予約作成 (UC-103)', () => {
  test('GUEST-201: ゲストユーザーが本予約を作成できる', async ({ request }) => {
    const payload = validGuestReservationPayload({
      reservation_type: 'regular',
      date: futureDateStr(90),
      start_time: '10:00',
      end_time: '12:00',
    });
    const res = await request.post('reservations/guest', { data: payload });
    expect(res.status(), `GUEST-201 body: ${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body.reservation_id).toBeTruthy();
    expect(body.guest_token).toBeTruthy();
    expect(typeof body.guest_token).toBe('string');
    expect(body.status).toBe('pending');
    expect(body.reservation_type).toBe('regular');
  });

  test('GUEST-202: ゲストユーザーが仮予約を作成できる', async ({ request }) => {
    const payload = validGuestReservationPayload({
      reservation_type: 'tentative',
      date: futureDateStr(91),
      start_time: '13:00',
      end_time: '15:00',
    });
    const res = await request.post('reservations/guest', { data: payload });
    expect(res.status(), `GUEST-202 body: ${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body.reservation_id).toBeTruthy();
    expect(body.guest_token).toBeTruthy();
    expect(body.reservation_type).toBe('tentative');
  });

  test('GUEST-203: ゲストユーザーがロケハン予約を作成できる', async ({ request }) => {
    // 最低利用時間 2 時間の制約のため 10:00〜12:00 で作成する
    const payload = validGuestReservationPayload({
      reservation_type: 'location_scout',
      date: futureDateStr(92),
      start_time: '10:00',
      end_time: '12:00',
    });
    const res = await request.post('reservations/guest', { data: payload });
    expect(res.status(), `GUEST-203 body: ${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body.reservation_id).toBeTruthy();
    expect(body.reservation_type).toBe('location_scout');
  });

  test('GUEST-204: ゲスト予約確認メールが送信される（guest_token存在で代替検証）', async ({
    request,
  }) => {
    const payload = validGuestReservationPayload({
      date: futureDateStr(93),
      start_time: '14:00',
      end_time: '16:00',
    });
    const res = await request.post('reservations/guest', { data: payload });
    expect(res.status(), `GUEST-204 body: ${await res.text()}`).toBe(201);
    const body = await res.json();
    // SES経由でインボックス確認不可のため、guest_tokenがレスポンスに含まれること
    // （= メール送信処理のパスを通過したこと）で代替検証する
    expect(body.guest_token).toBeTruthy();
    expect(body.status).toBe('pending');
  });

  test('GUEST-205: ゲスト情報（guest_name）が欠けている場合 → 400 VALIDATION_ERROR', async ({
    request,
  }) => {
    const payload = validGuestReservationPayload({ date: futureDateStr(94) });
    const { guest_name: _removed, ...payloadWithoutName } = payload;
    const res = await request.post('reservations/guest', { data: payloadWithoutName });
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    expect(err.error.details?.some((d) => d.field === 'guest_name')).toBe(true);
  });

  test('GUEST-206: ゲストメールアドレスが無効な形式の場合 → 400 VALIDATION_ERROR', async ({
    request,
  }) => {
    const payload = validGuestReservationPayload({
      date: futureDateStr(95),
      guest_email: 'not-an-email',
    });
    const res = await request.post('reservations/guest', { data: payload });
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    expect(err.error.details?.some((d) => d.field === 'guest_email')).toBe(true);
  });
});
