export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  company_name?: string;
  address: string;
};

// Cognitoには過去のE2E実行のアカウントが残るため、衝突回避のため十分にランダムなsuffixを付ける。
// Cognitoのデフォルト挙動でemailの "+" 以降が無視され同一とみなされるケースに対応するため、
// "+" は使わず英数字のみのlocal-partにする。
export const uniqueEmail = (prefix = 'e2e'): string => {
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}${Date.now()}${rand}@example.com`;
};

export const validSignupPayload = (overrides: Partial<SignupPayload> = {}): SignupPayload => ({
  name: 'E2Eテストユーザー',
  email: uniqueEmail(),
  password: 'Password123!',
  phone_number: '090-1234-5678',
  company_name: 'E2Eテスト株式会社',
  address: '東京都渋谷区テスト1-2-3',
  ...overrides,
});

export const validLoginPayload = (email: string, password = 'Password123!') => ({
  email,
  password,
});

export const futureDateStr = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export type GuestReservationPayload = {
  studio_id: string;
  reservation_type: string;
  plan_id: string;
  date: string;
  start_time: string;
  end_time: string;
  options: string[];
  shooting_type: string[];
  shooting_details: string;
  photographer_name: string;
  number_of_people: number;
  needs_protection: boolean;
  equipment_insurance: boolean;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_company?: string;
  note?: string;
};

export const validGuestReservationPayload = (
  overrides: Partial<GuestReservationPayload> = {}
): GuestReservationPayload => ({
  studio_id: 'studio_001',
  reservation_type: 'regular',
  plan_id: 'plan_001',
  date: futureDateStr(90),
  start_time: '10:00',
  end_time: '12:00',
  options: [],
  shooting_type: ['portrait'],
  shooting_details: 'E2Eテスト撮影',
  photographer_name: 'E2Eカメラマン',
  number_of_people: 2,
  needs_protection: false,
  equipment_insurance: false,
  guest_name: 'ゲストテスト太郎',
  guest_email: `guest${Date.now()}@example.com`,
  guest_phone: '090-1234-5678',
  ...overrides,
});
