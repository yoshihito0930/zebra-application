import type {
  Reservation,
  ReservationOption,
  CreateReservationRequest,
  CalendarResponse,
} from '../types';
import { apiRequest } from './api';

// backend (helper/reservation_response.go) は予約レスポンスを下記の形で返す:
//   { reservation_id, plan: { plan_id, plan_name, price, tax_rate },
//     options: [ { option_id, option_name, price, tax_rate } ], ... }
// frontend の Reservation 型は plan_id/plan_name/plan_price/plan_tax_rate を平坦
// に持つため、レスポンスを正規化してから上位へ渡す。
interface BackendReservation extends Omit<Reservation, 'plan_id' | 'plan_name' | 'plan_price' | 'plan_tax_rate' | 'options'> {
  plan?: { plan_id: string; plan_name: string; price: number; tax_rate: number };
  options?: Array<{ option_id: string; option_name: string; price: number; tax_rate: number }>;
}

const normalizeReservation = (raw: BackendReservation | Reservation): Reservation => {
  const r = raw as BackendReservation;
  const plan = r.plan;
  const options: ReservationOption[] = (r.options ?? []).map((o) => ({
    option_id: o.option_id,
    option_name: o.option_name,
    price: o.price,
    tax_rate: o.tax_rate,
  }));
  return {
    ...(raw as Reservation),
    plan_id: plan?.plan_id ?? (raw as Reservation).plan_id ?? '',
    plan_name: plan?.plan_name ?? (raw as Reservation).plan_name ?? '',
    plan_price: plan?.price ?? (raw as Reservation).plan_price ?? 0,
    plan_tax_rate: plan?.tax_rate ?? (raw as Reservation).plan_tax_rate ?? 0,
    options,
  };
};

// 予約カレンダー取得
// backend は `month=YYYY-MM` を受け取る (calendar-get/main.go)
export const getCalendar = async (
  studioId: string,
  year: number,
  month: number
): Promise<CalendarResponse> => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return apiRequest<CalendarResponse>({
    method: 'GET',
    url: `/studios/${studioId}/calendar`,
    params: { month: monthStr },
  });
};

// 予約作成
export const createReservation = async (
  data: CreateReservationRequest
): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'POST',
    url: '/reservations',
    data,
  });
  return normalizeReservation(raw);
};

// 自分の予約一覧取得 (backend は { reservations: [...] } で wrap)
export const getMyReservations = async (): Promise<Reservation[]> => {
  const resp = await apiRequest<{ reservations: BackendReservation[] }>({
    method: 'GET',
    url: '/reservations/me',
  });
  return (resp.reservations ?? []).map(normalizeReservation);
};

// 予約詳細取得
export const getReservation = async (id: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'GET',
    url: `/reservations/${id}`,
  });
  return normalizeReservation(raw);
};

// 予約キャンセル
export const cancelReservation = async (id: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/${id}/cancel`,
  });
  return normalizeReservation(raw);
};

// 全予約一覧取得 (admin/staff)。studio_id, start_date, end_date は必須
export interface AllReservationsParams {
  studio_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status?: string;
}

export const getAllReservations = async (
  params: AllReservationsParams
): Promise<Reservation[]> => {
  const resp = await apiRequest<{ reservations: BackendReservation[] }>({
    method: 'GET',
    url: '/reservations',
    params,
  });
  return (resp.reservations ?? []).map(normalizeReservation);
};

// 予約承認 (admin) — body は無し
export const approveReservation = async (id: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/${id}/approve`,
  });
  return normalizeReservation(raw);
};

// 予約拒否 (admin) — body は無し
export const rejectReservation = async (id: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/${id}/reject`,
  });
  return normalizeReservation(raw);
};

// 仮予約昇格 (customer/admin) — body は無し
export const promoteReservation = async (id: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/${id}/promote`,
  });
  return normalizeReservation(raw);
};

// UpdateReservationRequest型定義
export interface UpdateReservationRequest {
  date?: string;
  start_time?: string;
  end_time?: string;
  note?: string;
  shooting_details?: string;
}

// 予約編集 (admin)
export const updateReservation = async (
  id: string,
  data: UpdateReservationRequest
): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/${id}`,
    data,
  });
  return normalizeReservation(raw);
};

// ゲスト予約詳細取得 (token in path, 認証不要)
export const getGuestReservation = async (token: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'GET',
    url: `/reservations/guest/${token}`,
  });
  return normalizeReservation(raw);
};

// ゲスト予約キャンセル (token in path, 認証不要)
export const cancelGuestReservation = async (token: string): Promise<Reservation> => {
  const raw = await apiRequest<BackendReservation>({
    method: 'PATCH',
    url: `/reservations/guest/${token}/cancel`,
  });
  return normalizeReservation(raw);
};
