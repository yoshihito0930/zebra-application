// ユーザーロール
export type UserRole = 'customer' | 'admin' | 'staff';

// 予約種別
export type ReservationType = 'regular' | 'tentative' | 'location_scout' | 'second_keep';

// 予約ステータス
export type ReservationStatus =
  | 'pending'
  | 'tentative'
  | 'confirmed'
  | 'waitlisted'
  | 'scheduled'
  | 'cancelled'
  | 'expired'
  | 'completed';

// 撮影種別
export type ShootingType = 'stills' | 'video' | 'music';

// キャンセル者
export type CancelledBy = 'customer' | 'owner';

// 問い合わせステータス
export type InquiryStatus = 'open' | 'replied' | 'closed';

// ユーザー
export interface User {
  user_id: string;
  name: string;
  email: string;
  phone_number: string;
  company_name?: string;
  address: string;
  role: UserRole;
  studio_id?: string; // admin/staff の場合
  created_at: string;
  updated_at?: string;
}

// プラン
export interface Plan {
  plan_id: string;
  studio_id: string;
  plan_name: string;
  description?: string;
  price: number;
  tax_rate: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// オプション
export interface Option {
  option_id: string;
  studio_id: string;
  option_name: string;
  price: number;
  tax_rate: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// 予約オプション（スナップショット）
export interface ReservationOption {
  option_id: string;
  option_name: string;
  price: number;
  tax_rate: number;
}

// 予約
export interface Reservation {
  reservation_id: string;
  studio_id: string;
  user_id: string;
  reservation_type: ReservationType;
  status: ReservationStatus;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  plan_tax_rate: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  options: ReservationOption[];
  shooting_type: ShootingType[];
  shooting_details: string;
  photographer_name: string;
  number_of_people: number;
  needs_protection: boolean;
  equipment_insurance: boolean;
  note?: string;
  cancelled_by?: CancelledBy;
  cancelled_at?: string;
  promoted_from?: 'tentative';
  promoted_at?: string;
  linked_reservation_id?: string;
  expiry_date?: string;
  created_at: string;
  updated_at?: string;
  // ゲスト予約用フィールド
  is_guest?: boolean;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_company?: string;
  guest_token?: string;
  // 会員予約用の追加情報（管理画面用）
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_company?: string;
}

// 予約作成リクエスト
export interface CreateReservationRequest {
  studio_id: string;
  reservation_type: ReservationType;
  plan_id: string;
  date: string;
  start_time: string;
  end_time: string;
  options?: string[];
  shooting_type: ShootingType[];
  shooting_details: string;
  photographer_name: string;
  number_of_people: number;
  needs_protection: boolean;
  equipment_insurance: boolean;
  note?: string;
  // ゲスト予約用フィールド
  is_guest?: boolean;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_company?: string;
}

// 予約更新リクエスト
export interface UpdateReservationRequest {
  date?: string;
  start_time?: string;
  end_time?: string;
  note?: string;
  shooting_details?: string;
}

// ブロック枠
export interface BlockedSlot {
  blocked_slot_id: string;
  studio_id: string;
  date: string;
  is_all_day: boolean;
  start_time?: string;
  end_time?: string;
  reason: string;
  created_at: string;
}

// ブロック枠作成リクエスト
export interface CreateBlockedSlotRequest {
  studio_id: string;
  date: string;
  is_all_day: boolean;
  start_time?: string;
  end_time?: string;
  reason: string;
}

// カレンダー予約アイテム
export interface CalendarReservation {
  reservation_id: string;
  reservation_type: ReservationType;
  status: ReservationStatus;
  date: string;
  start_time: string;
  end_time: string;
}

// カレンダーレスポンス
export interface CalendarResponse {
  reservations: CalendarReservation[];
  blocked_slots: BlockedSlot[];
}

// 問い合わせ
export interface Inquiry {
  inquiry_id: string;
  studio_id: string;
  user_id: string;
  inquiry_title: string;
  inquiry_detail: string;
  inquiry_status: InquiryStatus;
  reply_detail?: string;
  replied_at?: string;
  created_at: string;
}

// 問い合わせ作成リクエスト
export interface CreateInquiryRequest {
  studio_id: string;
  inquiry_title: string;
  inquiry_detail: string;
}

// 問い合わせ回答リクエスト
export interface ReplyInquiryRequest {
  reply_detail: string;
}

// 認証レスポンス
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// サインアップリクエスト
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  company_name?: string;
  address: string;
}

// ログインリクエスト
export interface LoginRequest {
  email: string;
  password: string;
}

// APIエラーレスポンス
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// ページネーション
export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

// リスト型レスポンス
export interface ListResponse<T> {
  data: T[];
  pagination?: Pagination;
}
