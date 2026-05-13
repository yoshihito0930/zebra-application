import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createOptionApi,
  updateOptionApi,
  listPublicOptionsApi,
  type OptionResponse,
  type PublicOptionsResponse,
} from '../helpers/api';

const uniqueOptionName = (label: string): string =>
  `E2E-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('5.2 オプション管理 (UC-211)', () => {
  test('ADMIN-701: 管理者がオプションを作成できる → 201, is_active=true', async ({
    request,
    sharedAdmin,
  }) => {
    const res = await createOptionApi(request, sharedAdmin.accessToken, {
      option_name: uniqueOptionName('Opt-701'),
      price: 1500,
      tax_rate: 0.1,
    });
    expect(res.status(), `ADMIN-701 body: ${await res.text()}`).toBe(201);
    const body = (await res.json()) as OptionResponse;
    expect(body.is_active).toBe(true);
    expect(body.studio_id).toBe('studio_001');
    expect(body.price).toBe(1500);
    expect(body.option_id).toBeTruthy();
  });

  test('ADMIN-702: 管理者がオプションを更新できる → 200', async ({ request, sharedAdmin }) => {
    const createRes = await createOptionApi(request, sharedAdmin.accessToken, {
      option_name: uniqueOptionName('Opt-702-orig'),
      price: 1500,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as OptionResponse;

    const newName = uniqueOptionName('Opt-702-renamed');
    const res = await updateOptionApi(request, sharedAdmin.accessToken, created.option_id, {
      option_name: newName,
      price: 2500,
    });
    expect(res.status(), `ADMIN-702 body: ${await res.text()}`).toBe(200);
    const body = (await res.json()) as OptionResponse;
    expect(body.option_name).toBe(newName);
    expect(body.price).toBe(2500);
    expect(body.option_id).toBe(created.option_id);
  });

  test('ADMIN-703: 管理者がオプションを無効化できる → 200, is_active=false', async ({
    request,
    sharedAdmin,
  }) => {
    const createRes = await createOptionApi(request, sharedAdmin.accessToken, {
      option_name: uniqueOptionName('Opt-703'),
      price: 1500,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as OptionResponse;

    const res = await updateOptionApi(request, sharedAdmin.accessToken, created.option_id, {
      is_active: false,
    });
    expect(res.status(), `ADMIN-703 body: ${await res.text()}`).toBe(200);
    const body = (await res.json()) as OptionResponse;
    expect(body.is_active).toBe(false);
  });

  test('ADMIN-704: 無効化されたオプションが公開オプション一覧に表示されない', async ({
    request,
    sharedAdmin,
  }) => {
    const createRes = await createOptionApi(request, sharedAdmin.accessToken, {
      option_name: uniqueOptionName('Opt-704'),
      price: 1500,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as OptionResponse;

    const listBefore = await listPublicOptionsApi(request, 'studio_001');
    expect(listBefore.status()).toBe(200);
    const beforeBody = (await listBefore.json()) as PublicOptionsResponse;
    expect(beforeBody.options.some((o) => o.option_id === created.option_id)).toBe(true);

    const patchRes = await updateOptionApi(request, sharedAdmin.accessToken, created.option_id, {
      is_active: false,
    });
    expect(patchRes.status()).toBe(200);

    const listAfter = await listPublicOptionsApi(request, 'studio_001');
    expect(listAfter.status(), `ADMIN-704 list body: ${await listAfter.text()}`).toBe(200);
    const afterBody = (await listAfter.json()) as PublicOptionsResponse;
    expect(afterBody.options.some((o) => o.option_id === created.option_id)).toBe(false);
    // ポジティブ対照: seed の option_001 が含まれることを確認
    expect(afterBody.options.some((o) => o.option_id === 'option_001')).toBe(true);
  });
});
