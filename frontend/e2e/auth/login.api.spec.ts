import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { loginApi, parseError } from '../helpers/api';
import { uniqueEmail } from '../helpers/testData';

test.describe('1.2 ログイン (POST /auth/login)', () => {
  test('AUTH-101: 正しい認証情報でログインが成功する', async ({ request, sharedCustomer }) => {
    const res = await loginApi(request, {
      email: sharedCustomer.payload.email,
      password: sharedCustomer.payload.password,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    expect(typeof body.expires_in).toBe('number');
    // 注: 現状の login API レスポンスは user に email を含めない（access_token のJWT内には含まれる）
    expect(body.user).toMatchObject({
      name: sharedCustomer.payload.name,
      role: 'customer',
    });
    expect(body.user.user_id).toBeTruthy();
  });

  test('AUTH-102: 誤ったパスワード → 401 AUTH_LOGIN_FAILED', async ({ request, sharedCustomer }) => {
    const res = await loginApi(request, {
      email: sharedCustomer.payload.email,
      password: 'WrongPassword123!',
    });
    expect(res.status()).toBe(401);
    const err = await parseError(res);
    expect(err.error.code).toBe('AUTH_LOGIN_FAILED');
  });

  test('AUTH-103: 存在しないメールアドレス → 401 AUTH_LOGIN_FAILED', async ({ request }) => {
    const res = await loginApi(request, {
      email: uniqueEmail('nonexistent'),
      password: 'AnyPassword123!',
    });
    expect(res.status()).toBe(401);
    const err = await parseError(res);
    expect(err.error.code).toBe('AUTH_LOGIN_FAILED');
  });

  test('AUTH-104: メールアドレスが空 → 400 VALIDATION_ERROR', async ({ request }) => {
    const res = await loginApi(request, { password: 'SomePassword123!' });
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    expect(err.error.details?.some((d) => d.field === 'email')).toBe(true);
  });
});
