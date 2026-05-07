import { expect } from '@playwright/test';
import { test } from '../fixtures/auth';
import { loginApi, parseError, signupApi } from '../helpers/api';
import { uniqueEmail, validSignupPayload } from '../helpers/testData';

test.describe('1.1 ユーザー登録 (UC-101)', () => {
  // AUTH-001: 共有 customer の signup が成功している事実 (fixture 経由) と
  // そのアカウントでログインできることを検証する。Cognito throttle 対策で
  // 専用 signup を打たず fixture を再利用する。
  test('AUTH-001: 新規ユーザー登録が成功する', async ({ request, sharedCustomer }) => {
    expect(sharedCustomer.payload.email).toBeTruthy();
    expect(sharedCustomer.accessToken).toBeTruthy();
    // 副次検証: 作成済みアカウントで再ログインできる (Cognito にユーザーが存在する)
    const loginRes = await loginApi(request, {
      email: sharedCustomer.payload.email,
      password: sharedCustomer.payload.password,
    });
    expect(loginRes.status()).toBe(200);
    const login = await loginRes.json();
    expect(login.access_token).toBeTruthy();
    expect(login.user).toMatchObject({ name: sharedCustomer.payload.name, role: 'customer' });
  });

  // AUTH-002: 既存メールでの再signup → 409 EMAIL_ALREADY_EXISTS
  // 共有 customer の email を使うことで signup 呼び出しを1回節約する。
  test('AUTH-002: 既存メールアドレスで登録 → 409 EMAIL_ALREADY_EXISTS', async ({
    request,
    sharedCustomer,
  }) => {
    const second = await signupApi(request, {
      ...validSignupPayload(),
      email: sharedCustomer.payload.email,
    });
    expect(second.status()).toBe(409);
    const err = await parseError(second);
    expect(err.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('AUTH-003: 無効メール形式 → 400 VALIDATION_ERROR', async ({ request }) => {
    const payload = validSignupPayload({ email: 'not-an-email' });
    const res = await signupApi(request, payload);
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    expect(err.error.details?.some((d) => d.field === 'email')).toBe(true);
  });

  test('AUTH-004: パスワードが短すぎる → 400 VALIDATION_ERROR', async ({ request }) => {
    const payload = validSignupPayload({ password: 'short' });
    const res = await signupApi(request, payload);
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    expect(err.error.details?.some((d) => d.field === 'password')).toBe(true);
  });

  test('AUTH-005: 必須フィールド欠落 → 400 VALIDATION_ERROR', async ({ request }) => {
    const res = await signupApi(request, { email: uniqueEmail() });
    expect(res.status()).toBe(400);
    const err = await parseError(res);
    expect(err.error.code).toBe('VALIDATION_ERROR');
    const fields = err.error.details?.map((d) => d.field) ?? [];
    expect(fields).toEqual(expect.arrayContaining(['name', 'password', 'phone_number', 'address']));
  });
});
