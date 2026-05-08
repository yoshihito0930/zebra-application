import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { SignupPayload, GuestReservationPayload, MemberReservationPayload } from './testData';

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

export type GuestReservationCreateResponse = {
  reservation_id: string;
  guest_token: string;
  status: string;
  reservation_type: string;
  studio_id: string;
  date: string;
  start_time: string;
  end_time: string;
};

export const createGuestReservationApi = (
  request: APIRequestContext,
  payload: Partial<GuestReservationPayload>
) => request.post('reservations/guest', { data: payload });

export const getGuestReservationApi = (request: APIRequestContext, token: string) =>
  request.get(`reservations/guest/${token}`);

export const cancelGuestReservationApi = (request: APIRequestContext, token: string) =>
  request.patch(`reservations/guest/${token}/cancel`);

export const promoteGuestReservationApi = (request: APIRequestContext, token: string) =>
  request.patch(`reservations/guest/${token}/promote`);

// 会員予約 API ラッパ（CUSTOMER-001..404 用、2026-05-08 追加）
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const createReservationApi = (
  request: APIRequestContext,
  token: string,
  payload: Partial<MemberReservationPayload>
) => request.post('reservations', { headers: authHeaders(token), data: payload });

export const getReservationApi = (
  request: APIRequestContext,
  token: string,
  reservationID: string
) => request.get(`reservations/${reservationID}`, { headers: authHeaders(token) });

export const listMyReservationsApi = (
  request: APIRequestContext,
  token: string,
  status?: string
) => {
  const path = status ? `reservations/me?status=${encodeURIComponent(status)}` : 'reservations/me';
  return request.get(path, { headers: authHeaders(token) });
};

export const cancelReservationApi = (
  request: APIRequestContext,
  token: string,
  reservationID: string
) => request.patch(`reservations/${reservationID}/cancel`, { headers: authHeaders(token) });

export const promoteReservationApi = (
  request: APIRequestContext,
  token: string,
  reservationID: string
) => request.patch(`reservations/${reservationID}/promote`, { headers: authHeaders(token) });

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
