import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createPlanApi,
  updatePlanApi,
  createOptionApi,
  updateOptionApi,
  createReservationApi,
  parseError,
  type PlanResponse,
  type OptionResponse,
} from '../helpers/api';
import { adminFutureDateStr, validReservationPayload } from '../helpers/testData';

// CUSTOMER-012 / CUSTOMER-014 の再検証。
// Category 3 では dev 環境の plan/option 全件が is_active=true だったため SKIP していた。
// 本ファイルでは admin が ephemeral plan/option を作成 → 無効化 → customer が予約作成を試みる流れで再検証する。

const uniqueName = (label: string): string =>
  `E2E-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Category 2 再検証 (Cat 5 admin 連携)', () => {
  test('CUSTOMER-012: 無効化されたプランで予約作成 → 409 PLAN_INACTIVE', async ({
    request,
    sharedAdmin,
    sharedCustomer,
  }) => {
    // 1. admin がプランを作成
    const createRes = await createPlanApi(request, sharedAdmin.accessToken, {
      plan_name: uniqueName('Plan-CUST012'),
      price: 5000,
      tax_rate: 0.1,
    });
    expect(createRes.status(), `setup create plan: ${await createRes.text()}`).toBe(201);
    const plan = (await createRes.json()) as PlanResponse;

    // 2. admin がプランを無効化
    const patchRes = await updatePlanApi(request, sharedAdmin.accessToken, plan.plan_id, {
      is_active: false,
    });
    expect(patchRes.status()).toBe(200);

    // 3. customer が無効化されたプランで予約作成 → 409 PLAN_INACTIVE
    const res = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        plan_id: plan.plan_id,
        date: adminFutureDateStr(560),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(res.status(), `CUSTOMER-012 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('PLAN_INACTIVE');
  });

  test('CUSTOMER-014: 無効化されたオプションで予約作成 → 409 OPTION_INACTIVE', async ({
    request,
    sharedAdmin,
    sharedCustomer,
  }) => {
    // 1. admin がオプションを作成 (plan は seed の plan_001 を使う)
    const createOptRes = await createOptionApi(request, sharedAdmin.accessToken, {
      option_name: uniqueName('Opt-CUST014'),
      price: 1500,
      tax_rate: 0.1,
    });
    expect(createOptRes.status(), `setup create option: ${await createOptRes.text()}`).toBe(201);
    const option = (await createOptRes.json()) as OptionResponse;

    // 2. admin がオプションを無効化
    const patchRes = await updateOptionApi(request, sharedAdmin.accessToken, option.option_id, {
      is_active: false,
    });
    expect(patchRes.status()).toBe(200);

    // 3. customer が有効プラン + 無効オプションで予約作成 → 409 OPTION_INACTIVE
    const res = await createReservationApi(
      request,
      sharedCustomer.accessToken,
      validReservationPayload({
        plan_id: 'plan_001',
        options: [option.option_id],
        date: adminFutureDateStr(561),
        start_time: '10:00',
        end_time: '12:00',
      })
    );
    expect(res.status(), `CUSTOMER-014 body: ${await res.text()}`).toBe(409);
    const err = await parseError(res);
    expect(err.error.code).toBe('OPTION_INACTIVE');
  });
});
