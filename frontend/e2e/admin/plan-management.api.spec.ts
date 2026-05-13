import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import {
  createPlanApi,
  updatePlanApi,
  listPublicPlansApi,
  parseError,
  type PlanResponse,
  type PublicPlansResponse,
} from '../helpers/api';

// ADMIN-601..605 は ephemeral plan を都度 POST して操作するため、テスト間の順序依存無し。
// 各テストで一意な plan_name suffix (Date.now() + ランダム) を付ける。

const uniquePlanName = (label: string): string =>
  `E2E-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('5.1 プラン管理 (UC-211)', () => {
  test('ADMIN-601: 管理者がプランを作成できる → 201, is_active=true', async ({
    request,
    sharedAdmin,
  }) => {
    const res = await createPlanApi(request, sharedAdmin.accessToken, {
      plan_name: uniquePlanName('Plan-601'),
      description: 'e2e fixture',
      price: 5000,
      tax_rate: 0.1,
    });
    expect(res.status(), `ADMIN-601 body: ${await res.text()}`).toBe(201);
    const body = (await res.json()) as PlanResponse;
    expect(body.is_active).toBe(true);
    expect(body.studio_id).toBe('studio_001');
    expect(body.price).toBe(5000);
    expect(body.plan_id).toBeTruthy();
  });

  test('ADMIN-602: 管理者がプランを更新できる → 200', async ({ request, sharedAdmin }) => {
    const createRes = await createPlanApi(request, sharedAdmin.accessToken, {
      plan_name: uniquePlanName('Plan-602'),
      description: 'initial',
      price: 5000,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as PlanResponse;

    const res = await updatePlanApi(request, sharedAdmin.accessToken, created.plan_id, {
      price: 7000,
      description: 'updated description',
    });
    expect(res.status(), `ADMIN-602 body: ${await res.text()}`).toBe(200);
    const body = (await res.json()) as PlanResponse;
    expect(body.price).toBe(7000);
    expect(body.description).toBe('updated description');
    expect(body.plan_id).toBe(created.plan_id);
  });

  test('ADMIN-603: 管理者がプランを無効化できる → 200, is_active=false', async ({
    request,
    sharedAdmin,
  }) => {
    const createRes = await createPlanApi(request, sharedAdmin.accessToken, {
      plan_name: uniquePlanName('Plan-603'),
      price: 5000,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as PlanResponse;

    const res = await updatePlanApi(request, sharedAdmin.accessToken, created.plan_id, {
      is_active: false,
    });
    expect(res.status(), `ADMIN-603 body: ${await res.text()}`).toBe(200);
    const body = (await res.json()) as PlanResponse;
    expect(body.is_active).toBe(false);
  });

  test('ADMIN-604: 無効化されたプランが公開プラン一覧に表示されない', async ({
    request,
    sharedAdmin,
  }) => {
    const createRes = await createPlanApi(request, sharedAdmin.accessToken, {
      plan_name: uniquePlanName('Plan-604'),
      price: 5000,
      tax_rate: 0.1,
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as PlanResponse;

    // 作成直後は active で公開一覧に含まれることを確認
    const listBefore = await listPublicPlansApi(request, 'studio_001');
    expect(listBefore.status()).toBe(200);
    const beforeBody = (await listBefore.json()) as PublicPlansResponse;
    expect(beforeBody.plans.some((p) => p.plan_id === created.plan_id)).toBe(true);

    // 無効化
    const patchRes = await updatePlanApi(request, sharedAdmin.accessToken, created.plan_id, {
      is_active: false,
    });
    expect(patchRes.status()).toBe(200);

    // 無効化後は公開一覧から除外されることを確認
    const listAfter = await listPublicPlansApi(request, 'studio_001');
    expect(listAfter.status(), `ADMIN-604 list body: ${await listAfter.text()}`).toBe(200);
    const afterBody = (await listAfter.json()) as PublicPlansResponse;
    expect(afterBody.plans.some((p) => p.plan_id === created.plan_id)).toBe(false);
    // ポジティブ対照: seed の plan_001 が存在することを確認 (active なため)
    expect(afterBody.plans.some((p) => p.plan_id === 'plan_001')).toBe(true);
  });

  test.skip('ADMIN-605: 他スタジオのプランを作成しようとする', async () => {
    // Bug 17: POST /plans は body の studio_id を受け付けず、Cognito の custom:studio_id を信頼する設計。
    // PATCH /plans/{id} も他スタジオ id では (studio_id, plan_id) 複合キー検索で 404 PLAN_NOT_FOUND を返すため、
    // 403 FORBIDDEN_RESOURCE は構造上発生しない。docs/e2e-test-plan.md §5.3 Bug 17 を参照。
  });
});
