import apiClient, { apiRequest } from './api';
import type {
  Reservation,
  CreateReservationRequest,
  CalendarResponse,
  CalendarReservation,
} from '../types';

// 予約カレンダー取得
export const getCalendar = async (
  studioId: string,
  year: number,
  month: number
): Promise<CalendarResponse> => {
  return apiRequest<CalendarResponse>({
    method: 'GET',
    url: `/studios/${studioId}/calendar`,
    params: { year, month },
  });
};

// 予約作成
export const createReservation = async (
  data: CreateReservationRequest
): Promise<Reservation> => {
  return apiRequest<Reservation>({
    method: 'POST',
    url: '/reservations',
    data,
  });
};

// 自分の予約一覧取得
export const getMyReservations = async (): Promise<Reservation[]> => {
  return apiRequest<Reservation[]>({
    method: 'GET',
    url: '/reservations/me',
  });
};

// 予約詳細取得
export const getReservation = async (id: string): Promise<Reservation> => {
  return apiRequest<Reservation>({
    method: 'GET',
    url: `/reservations/${id}`,
  });
};

// 予約キャンセル
export const cancelReservation = async (id: string): Promise<Reservation> => {
  return apiRequest<Reservation>({
    method: 'PATCH',
    url: `/reservations/${id}/cancel`,
  });
};

// モックデータ（開発用）
const mockReservations: Reservation[] = [
  {
    reservation_id: 'rsv_001',
    studio_id: 'studio_001',
    user_id: 'user_001',
    reservation_type: 'regular',
    status: 'confirmed',
    plan_id: 'plan_001',
    plan_name: 'スチール撮影プラン',
    plan_price: 15000,
    plan_tax_rate: 0.1,
    date: '2026-04-20',
    start_time: '10:00',
    end_time: '13:00',
    options: [
      {
        option_id: 'opt_001',
        option_name: '6人以上のワークショップでご利用',
        price: 2000,
        tax_rate: 0.1,
      },
    ],
    shooting_type: ['stills'],
    shooting_details: '商品撮影',
    photographer_name: '佐藤次郎',
    number_of_people: 5,
    needs_protection: false,
    equipment_insurance: true,
    note: '大型機材持ち込み予定',
    created_at: '2026-04-10T10:00:00Z',
  },
  {
    reservation_id: 'rsv_002',
    studio_id: 'studio_001',
    user_id: 'user_001',
    reservation_type: 'tentative',
    status: 'tentative',
    plan_id: 'plan_002',
    plan_name: '動画撮影プラン',
    plan_price: 20000,
    plan_tax_rate: 0.1,
    date: '2026-04-25',
    start_time: '14:00',
    end_time: '18:00',
    options: [],
    shooting_type: ['video'],
    shooting_details: 'インタビュー動画',
    photographer_name: '鈴木一郎',
    number_of_people: 3,
    needs_protection: false,
    equipment_insurance: true,
    expiry_date: '2026-04-18',
    created_at: '2026-04-11T14:00:00Z',
  },
  {
    reservation_id: 'rsv_003',
    studio_id: 'studio_001',
    user_id: 'user_002',
    reservation_type: 'regular',
    status: 'confirmed',
    plan_id: 'plan_001',
    plan_name: 'スチール撮影プラン',
    plan_price: 15000,
    plan_tax_rate: 0.1,
    date: '2026-04-22',
    start_time: '10:00',
    end_time: '14:00',
    options: [],
    shooting_type: ['stills'],
    shooting_details: 'ポートレート撮影',
    photographer_name: '田中花子',
    number_of_people: 2,
    needs_protection: false,
    equipment_insurance: true,
    created_at: '2026-04-12T09:00:00Z',
  },
  {
    reservation_id: 'rsv_004',
    studio_id: 'studio_001',
    user_id: 'user_003',
    reservation_type: 'regular',
    status: 'pending',
    plan_id: 'plan_001',
    plan_name: 'スチール撮影プラン',
    plan_price: 15000,
    plan_tax_rate: 0.1,
    date: '2026-04-18',
    start_time: '10:00',
    end_time: '13:00',
    options: [],
    shooting_type: ['stills'],
    shooting_details: 'ファッション撮影',
    photographer_name: '山田太郎',
    number_of_people: 4,
    needs_protection: false,
    equipment_insurance: true,
    note: '初めての利用です',
    created_at: '2026-04-15T10:00:00Z',
  },
  {
    reservation_id: 'rsv_005',
    studio_id: 'studio_001',
    user_id: 'user_004',
    reservation_type: 'location_scout',
    status: 'pending',
    plan_id: 'plan_003',
    plan_name: 'ロケハンプラン',
    plan_price: 5000,
    plan_tax_rate: 0.1,
    date: '2026-04-19',
    start_time: '14:00',
    end_time: '15:00',
    options: [],
    shooting_type: ['stills'],
    shooting_details: '下見のため',
    photographer_name: '中村花子',
    number_of_people: 2,
    needs_protection: false,
    equipment_insurance: false,
    created_at: '2026-04-15T14:00:00Z',
  },
  {
    reservation_id: 'rsv_006',
    studio_id: 'studio_001',
    user_id: 'guest',
    reservation_type: 'regular',
    status: 'pending',
    plan_id: 'plan_002',
    plan_name: '動画撮影プラン',
    plan_price: 20000,
    plan_tax_rate: 0.1,
    date: '2026-04-23',
    start_time: '10:00',
    end_time: '14:00',
    options: [
      {
        option_id: 'opt_001',
        option_name: '6人以上のワークショップでご利用',
        price: 2000,
        tax_rate: 0.1,
      },
    ],
    shooting_type: ['video'],
    shooting_details: 'YouTube動画撮影',
    photographer_name: '佐々木健',
    number_of_people: 6,
    needs_protection: false,
    equipment_insurance: true,
    is_guest: true,
    guest_name: '鈴木太郎',
    guest_email: 'suzuki@example.com',
    guest_phone: '090-1234-5678',
    guest_company: '株式会社テスト',
    guest_token: 'guest_test_token_001',
    created_at: '2026-04-16T09:00:00Z',
  },
];

// モック: カレンダー取得
export const mockGetCalendar = async (
  studioId: string,
  year: number,
  month: number
): Promise<CalendarResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  // 該当月の予約をフィルタ
  const reservations = mockReservations
    .filter((r) => {
      const reservationDate = new Date(r.date);
      return (
        r.studio_id === studioId &&
        reservationDate.getFullYear() === year &&
        reservationDate.getMonth() + 1 === month
      );
    })
    .map((r): CalendarReservation => ({
      reservation_id: r.reservation_id,
      reservation_type: r.reservation_type,
      status: r.status,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
    }));

  return {
    reservations,
    blocked_slots: [],
  };
};

// モック: 自分の予約一覧取得
export const mockGetMyReservations = async (): Promise<Reservation[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms遅延

  // 現在のユーザーIDを取得（authStoreから）
  const user = JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.user;
  const userId = user?.user_id;

  return mockReservations.filter((r) => r.user_id === userId);
};

// トークン生成ユーティリティ（モック用）
const generateGuestToken = (): string => {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// モック: 予約作成
export const mockCreateReservation = async (
  data: CreateReservationRequest
): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒遅延

  // 現在のユーザーIDを取得
  const user = JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.user;
  const userId = data.is_guest ? 'guest' : (user?.user_id || 'user_guest');

  // プラン情報を取得（モックデータから）
  const { mockPlans } = await import('./planService');
  const plan = mockPlans.find((p) => p.plan_id === data.plan_id);

  if (!plan) {
    throw new Error('プランが見つかりません');
  }

  // オプション情報を取得
  const { mockOptions } = await import('./planService');
  const selectedOptions = mockOptions
    .filter((o) => data.options?.includes(o.option_id))
    .map((o) => ({
      option_id: o.option_id,
      option_name: o.option_name,
      price: o.price,
      tax_rate: o.tax_rate,
    }));

  // ゲスト予約の場合、トークンを生成
  const guestToken = data.is_guest ? generateGuestToken() : undefined;

  const newReservation: Reservation = {
    reservation_id: `rsv_${Date.now()}`,
    studio_id: data.studio_id,
    user_id: userId,
    reservation_type: data.reservation_type,
    status: 'pending',
    plan_id: data.plan_id,
    plan_name: plan.plan_name,
    plan_price: plan.price,
    plan_tax_rate: plan.tax_rate,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    options: selectedOptions,
    shooting_type: data.shooting_type,
    shooting_details: data.shooting_details,
    photographer_name: data.photographer_name,
    number_of_people: data.number_of_people,
    needs_protection: data.needs_protection,
    equipment_insurance: data.equipment_insurance,
    note: data.note,
    created_at: new Date().toISOString(),
    // ゲスト予約フィールド
    is_guest: data.is_guest,
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    guest_company: data.guest_company,
    guest_token: guestToken,
  };

  // モックデータに追加（実際のアプリではバックエンドに保存）
  mockReservations.push(newReservation);

  // ゲスト予約の場合、LocalStorageにも保存（トークンベースで取得できるように）
  if (data.is_guest && guestToken) {
    const guestReservations = JSON.parse(localStorage.getItem('guest-reservations') || '{}');
    guestReservations[guestToken] = newReservation;
    localStorage.setItem('guest-reservations', JSON.stringify(guestReservations));
  }

  return newReservation;
};

// モック: 予約キャンセル
export const mockCancelReservation = async (id: string): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  const reservation = mockReservations.find((r) => r.reservation_id === id);
  if (!reservation) {
    throw new Error('予約が見つかりません');
  }

  reservation.status = 'cancelled';
  reservation.cancelled_at = new Date().toISOString();
  reservation.cancelled_by = 'customer';

  return reservation;
};

// モック: ゲスト予約取得（トークンベース）
export const mockGetGuestReservation = async (token: string): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms遅延

  // LocalStorageから取得
  const guestReservations = JSON.parse(localStorage.getItem('guest-reservations') || '{}');
  const reservation = guestReservations[token];

  if (!reservation) {
    throw new Error('予約が見つかりません。トークンが無効か、期限切れの可能性があります。');
  }

  return reservation;
};

// モック: ゲスト予約キャンセル（トークンベース）
export const mockCancelGuestReservation = async (token: string): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  // LocalStorageから取得
  const guestReservations = JSON.parse(localStorage.getItem('guest-reservations') || '{}');
  const reservation = guestReservations[token];

  if (!reservation) {
    throw new Error('予約が見つかりません。トークンが無効か、期限切れの可能性があります。');
  }

  // キャンセル処理
  reservation.status = 'cancelled';
  reservation.cancelled_at = new Date().toISOString();
  reservation.cancelled_by = 'customer';

  // LocalStorageを更新
  guestReservations[token] = reservation;
  localStorage.setItem('guest-reservations', JSON.stringify(guestReservations));

  // mockReservationsも更新
  const index = mockReservations.findIndex((r) => r.reservation_id === reservation.reservation_id);
  if (index !== -1) {
    mockReservations[index] = reservation;
  }

  return reservation;
};

// モック: 全予約取得（管理者用）
export const mockGetAllReservations = async (
  studioId: string,
  status?: string
): Promise<Reservation[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms遅延

  let reservations = mockReservations.filter((r) => r.studio_id === studioId);

  // ステータスでフィルタリング
  if (status && status !== 'all') {
    reservations = reservations.filter((r) => r.status === status);
  }

  // 日付の降順でソート
  return reservations.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.start_time}`);
    const dateB = new Date(`${b.date} ${b.start_time}`);
    return dateB.getTime() - dateA.getTime();
  });
};

// モック: 予約承認（管理者用）
export const mockApproveReservation = async (
  id: string,
  approvedStatus: 'confirmed' | 'tentative' | 'scheduled'
): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  const reservation = mockReservations.find((r) => r.reservation_id === id);
  if (!reservation) {
    throw new Error('予約が見つかりません');
  }

  if (reservation.status !== 'pending') {
    throw new Error('承認できるのは承認待ちの予約のみです');
  }

  reservation.status = approvedStatus;
  reservation.updated_at = new Date().toISOString();

  // 仮予約の場合は有効期限を設定（利用日の7日前）
  if (approvedStatus === 'tentative') {
    const reservationDate = new Date(reservation.date);
    const expiryDate = new Date(reservationDate);
    expiryDate.setDate(expiryDate.getDate() - 7);
    reservation.expiry_date = expiryDate.toISOString().split('T')[0];
  }

  return reservation;
};

// モック: 予約拒否（管理者用）
export const mockRejectReservation = async (
  id: string,
  note?: string
): Promise<Reservation> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  const reservation = mockReservations.find((r) => r.reservation_id === id);
  if (!reservation) {
    throw new Error('予約が見つかりません');
  }

  if (reservation.status !== 'pending') {
    throw new Error('拒否できるのは承認待ちの予約のみです');
  }

  reservation.status = 'cancelled';
  reservation.cancelled_by = 'owner';
  reservation.cancelled_at = new Date().toISOString();
  if (note) {
    reservation.note = note;
  }

  return reservation;
};
