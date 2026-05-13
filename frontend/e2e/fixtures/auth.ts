import { test as base, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loginApi, signupApi } from '../helpers/api';
import { validSignupPayload, type SignupPayload } from '../helpers/testData';

export type SharedCustomer = {
  payload: SignupPayload;
  accessToken: string;
};

let _sharedCustomer: SharedCustomer | null = null;
let _sharedCustomer2: SharedCustomer | null = null;

// 共有 customer を取得 (なければ作成)。Cognito の signup throttle を避けるため、
// テスト間で同一トークンを再利用する。
// 環境変数 E2E_REUSE_USER_EMAIL / E2E_REUSE_USER_PASSWORD を設定すると、
// 既存ユーザーを使い回し signup を skip する (Cognito throttle 回避)。
export const getSharedCustomer = async (
  request: APIRequestContext
): Promise<SharedCustomer> => {
  if (_sharedCustomer) return _sharedCustomer;

  const reuseEmail = process.env.E2E_REUSE_USER_EMAIL;
  const reusePassword = process.env.E2E_REUSE_USER_PASSWORD;
  if (reuseEmail && reusePassword) {
    const loginRes = await loginApi(request, { email: reuseEmail, password: reusePassword });
    expect(loginRes.status(), `reuse user login must succeed: ${await loginRes.text()}`).toBe(200);
    const body = await loginRes.json();
    _sharedCustomer = {
      payload: {
        name: body.user?.name ?? 'reused user',
        email: reuseEmail,
        password: reusePassword,
        phone_number: '090-0000-0000',
        address: '東京都',
      },
      accessToken: body.access_token,
    };
    return _sharedCustomer;
  }

  const payload = validSignupPayload();
  const signupRes = await signupApi(request, payload);
  expect(signupRes.status(), `shared customer signup must succeed: ${await signupRes.text()}`).toBe(
    201
  );
  const loginRes = await loginApi(request, { email: payload.email, password: payload.password });
  expect(loginRes.status(), 'shared customer login must succeed').toBe(200);
  const { access_token } = await loginRes.json();
  _sharedCustomer = { payload, accessToken: access_token };
  return _sharedCustomer;
};

// 第 2 共有 customer (CUSTOMER-202 / CUSTOMER-306 など、他ユーザーの予約を扱うテスト用)
// 同じく E2E_REUSE_USER2_EMAIL / E2E_REUSE_USER2_PASSWORD で既存ユーザー再利用が可能
export const getSharedCustomer2 = async (
  request: APIRequestContext
): Promise<SharedCustomer> => {
  if (_sharedCustomer2) return _sharedCustomer2;

  const reuseEmail = process.env.E2E_REUSE_USER2_EMAIL;
  const reusePassword = process.env.E2E_REUSE_USER2_PASSWORD;
  if (reuseEmail && reusePassword) {
    const loginRes = await loginApi(request, { email: reuseEmail, password: reusePassword });
    expect(loginRes.status(), `reuse user2 login must succeed: ${await loginRes.text()}`).toBe(200);
    const body = await loginRes.json();
    _sharedCustomer2 = {
      payload: {
        name: body.user?.name ?? 'reused user2',
        email: reuseEmail,
        password: reusePassword,
        phone_number: '090-0000-0000',
        address: '東京都',
      },
      accessToken: body.access_token,
    };
    return _sharedCustomer2;
  }

  const payload = validSignupPayload();
  const signupRes = await signupApi(request, payload);
  expect(signupRes.status(), `shared customer2 signup must succeed: ${await signupRes.text()}`).toBe(
    201
  );
  const loginRes = await loginApi(request, { email: payload.email, password: payload.password });
  expect(loginRes.status(), 'shared customer2 login must succeed').toBe(200);
  const { access_token } = await loginRes.json();
  _sharedCustomer2 = { payload, accessToken: access_token };
  return _sharedCustomer2;
};

// 共有 admin。Category 4 以降の admin endpoint テスト用。
// signup 経路は持たず、E2E_REUSE_USER_ADMIN_EMAIL/PASSWORD で
// 事前に Cognito 上で custom:role=admin, custom:studio_id=studio_001 を
// 設定された専用ユーザーを再利用する。
// プロビジョニング手順は docs/e2e-test-plan.md §4.7 を参照。
export type SharedAdmin = {
  payload: SignupPayload;
  accessToken: string;
  studioID: string;
};

let _sharedAdmin: SharedAdmin | null = null;

export const getSharedAdmin = async (
  request: APIRequestContext
): Promise<SharedAdmin> => {
  if (_sharedAdmin) return _sharedAdmin;

  const reuseEmail = process.env.E2E_REUSE_USER_ADMIN_EMAIL;
  const reusePassword = process.env.E2E_REUSE_USER_ADMIN_PASSWORD;
  if (!reuseEmail || !reusePassword) {
    throw new Error(
      'E2E_REUSE_USER_ADMIN_EMAIL / E2E_REUSE_USER_ADMIN_PASSWORD must be set. ' +
        'See docs/e2e-test-plan.md §4.7 for provisioning steps.'
    );
  }
  const loginRes = await loginApi(request, { email: reuseEmail, password: reusePassword });
  expect(loginRes.status(), `admin login must succeed: ${await loginRes.text()}`).toBe(200);
  const body = await loginRes.json();
  expect(body.user?.role, 'admin user must have role=admin in login response').toBe('admin');
  _sharedAdmin = {
    payload: {
      name: body.user?.name ?? 'e2e admin',
      email: reuseEmail,
      password: reusePassword,
      phone_number: '090-0000-1111',
      address: '東京都',
    },
    accessToken: body.access_token,
    studioID: body.user?.studio_id ?? 'studio_001',
  };
  return _sharedAdmin;
};

export const test = base.extend<{
  sharedCustomer: SharedCustomer;
  sharedCustomer2: SharedCustomer;
  sharedAdmin: SharedAdmin;
}>({
  sharedCustomer: async ({ request }, use) => {
    const sc = await getSharedCustomer(request);
    await use(sc);
  },
  sharedCustomer2: async ({ request }, use) => {
    const sc = await getSharedCustomer2(request);
    await use(sc);
  },
  sharedAdmin: async ({ request }, use) => {
    const a = await getSharedAdmin(request);
    await use(a);
  },
});
