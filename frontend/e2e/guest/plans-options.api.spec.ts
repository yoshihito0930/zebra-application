import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';

const STUDIO_ID = 'studio_001';

test.describe('2.2 プラン・オプション閲覧', () => {
  test('GUEST-101: ゲストユーザーがプラン一覧を取得できる', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/plans`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.plans)).toBe(true);
    // dev環境にプランが存在すること
    expect(body.plans.length).toBeGreaterThan(0);
    const plan = body.plans[0];
    expect(plan.plan_id).toBeTruthy();
    expect(plan.plan_name).toBeTruthy();
    expect(typeof plan.price).toBe('number');
    expect(typeof plan.tax_rate).toBe('number');
  });

  test('GUEST-102: ゲストユーザーがオプション一覧を取得できる', async ({ request }) => {
    const res = await request.get(`studios/${STUDIO_ID}/options`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.options)).toBe(true);
  });

  test('GUEST-103: 無効化されたプランは表示されない', async ({ request }) => {
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    const createRes = await request.post('plans', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        studio_id: STUDIO_ID,
        plan_name: `E2E inactive plan ${Date.now()}`,
        price: 9999,
        tax_rate: 0.1,
        is_active: false,
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const inactivePlanId: string = created.plan_id;

    try {
      const listRes = await request.get(`studios/${STUDIO_ID}/plans`);
      expect(listRes.status()).toBe(200);
      const body = await listRes.json();
      const ids = body.plans.map((p: { plan_id: string }) => p.plan_id);
      expect(ids).not.toContain(inactivePlanId);
    } finally {
      if (inactivePlanId) {
        await request.delete(`plans/${inactivePlanId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  });

  test('GUEST-104: 無効化されたオプションは表示されない', async ({ request }) => {
    const adminToken = process.env.E2E_ADMIN_TOKEN;
    if (!adminToken) {
      test.skip();
      return;
    }
    const createRes = await request.post('options', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        studio_id: STUDIO_ID,
        option_name: `E2E inactive option ${Date.now()}`,
        price: 9999,
        tax_rate: 0.1,
        is_active: false,
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const inactiveOptionId: string = created.option_id;

    try {
      const listRes = await request.get(`studios/${STUDIO_ID}/options`);
      expect(listRes.status()).toBe(200);
      const body = await listRes.json();
      const ids = body.options.map((o: { option_id: string }) => o.option_id);
      expect(ids).not.toContain(inactiveOptionId);
    } finally {
      if (inactiveOptionId) {
        await request.delete(`options/${inactiveOptionId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  });
});
