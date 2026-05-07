import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { SignupPayload } from './testData';

export type AuthError = {
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { user_id: string; name: string; email: string; role: string; studio_id?: string };
};

export type SignupResponse = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export const signupApi = (request: APIRequestContext, payload: Partial<SignupPayload>) =>
  request.post('auth/signup', { data: payload });

export const loginApi = (
  request: APIRequestContext,
  payload: { email?: string; password?: string }
) => request.post('auth/login', { data: payload });

export const meApi = (request: APIRequestContext, accessToken?: string) =>
  request.get('users/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

export const parseError = async (response: APIResponse): Promise<AuthError> =>
  (await response.json()) as AuthError;

export const signupAndLogin = async (
  request: APIRequestContext,
  payload: SignupPayload
): Promise<{ signup: SignupResponse; login: LoginResponse }> => {
  const signupRes = await signupApi(request, payload);
  if (!signupRes.ok()) {
    throw new Error(`signup failed: ${signupRes.status()} ${await signupRes.text()}`);
  }
  const signup = (await signupRes.json()) as SignupResponse;
  const loginRes = await loginApi(request, { email: payload.email, password: payload.password });
  if (!loginRes.ok()) {
    throw new Error(`login failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
  const login = (await loginRes.json()) as LoginResponse;
  return { signup, login };
};
