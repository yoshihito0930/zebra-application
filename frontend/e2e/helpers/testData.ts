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

// 注意: company_name を含めると現状のdev APIで EMAIL_ALREADY_EXISTS が誤って返る既知不具合あり。
// デフォルト payload では omit する。検証時は overrides で渡すこと。
export const validSignupPayload = (overrides: Partial<SignupPayload> = {}): SignupPayload => ({
  name: 'E2Eテストユーザー',
  email: uniqueEmail(),
  password: 'Password123!',
  phone_number: '090-1234-5678',
  address: '東京都渋谷区テスト1-2-3',
  ...overrides,
});

export const validLoginPayload = (email: string, password = 'Password123!') => ({
  email,
  password,
});
