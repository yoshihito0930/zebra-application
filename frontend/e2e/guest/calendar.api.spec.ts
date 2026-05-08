import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { parseError } from '../helpers/api';

const STUDIO_ID = 'studio_001';

test.describe('2.1 カレンダー閲覧 (UC-102)', () => {
  test('GUEST-001: ゲストユーザーがカレンダーを閲覧できる', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/calendar`, {
      params: { month: '2026-06' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reservations)).toBe(true);
    expect(Array.isArray(body.blocked_slots)).toBe(true);
  });

  test('GUEST-002: カレンダーにconfirmed予約が表示される', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/calendar`, {
      params: { month: '2026-06' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // 予約一覧が配列として返ること（dev環境に確定予約があれば含まれる）
    expect(body.reservations).toBeDefined();
    expect(Array.isArray(body.reservations)).toBe(true);
    // confirmed 予約が存在する場合は reservation_type / status フィールドを持つこと
    const confirmed = body.reservations.filter(
      (r: { status: string }) => r.status === 'confirmed'
    );
    for (const r of confirmed) {
      expect(r.reservation_id).toBeTruthy();
      expect(r.date).toBeTruthy();
      expect(r.start_time).toBeTruthy();
      expect(r.end_time).toBeTruthy();
    }
  });

  test('GUEST-003: カレンダーにブロック枠が表示される', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/calendar`, {
      params: { month: '2026-06' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.blocked_slots).toBeDefined();
    expect(Array.isArray(body.blocked_slots)).toBe(true);
    // ブロック枠が存在する場合は所定フィールドを持つこと
    for (const b of body.blocked_slots) {
      expect(b.blocked_slot_id).toBeTruthy();
      expect(b.date).toBeTruthy();
      expect(typeof b.is_all_day).toBe('boolean');
    }
  });

  test('GUEST-004: 無効なmonth形式でリクエスト → 400 VALIDATION_ERROR', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/calendar`, {
      params: { month: '2026/06' },
    });
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
  });
});
