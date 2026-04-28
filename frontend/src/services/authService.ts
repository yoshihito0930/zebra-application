import type { AuthResponse, LoginRequest, SignupRequest, User } from '../types';
import {
  cognitoLogin,
  cognitoSignup,
  cognitoConfirmSignup,
  cognitoResendConfirmationCode,
  cognitoLogout,
  cognitoRefreshToken,
  cognitoForgotPassword,
  cognitoConfirmPassword,
} from './cognitoService';

// 環境変数でモード切り替え（開発時はモック、本番はCognito）
const USE_COGNITO = import.meta.env.VITE_USE_COGNITO === 'true';

// ログイン
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  if (USE_COGNITO) {
    return cognitoLogin(data);
  }
  // モック版（開発用）
  return mockLogin(data);
};

// サインアップ
export const signup = async (data: SignupRequest): Promise<{ user_id: string; email: string }> => {
  if (USE_COGNITO) {
    const result = await cognitoSignup(data);
    return { ...result, email: data.email };
  }
  // モック版（開発用）
  const result = await mockSignup(data);
  return { user_id: result.user.user_id, email: data.email };
};

// メール検証
export const confirmSignup = async (email: string, code: string): Promise<void> => {
  if (USE_COGNITO) {
    return cognitoConfirmSignup(email, code);
  }
  // モック版は何もしない
  return Promise.resolve();
};

// 検証コード再送
export const resendConfirmationCode = async (email: string): Promise<void> => {
  if (USE_COGNITO) {
    return cognitoResendConfirmationCode(email);
  }
  // モック版は何もしない
  return Promise.resolve();
};

// ログアウト
export const logout = async (): Promise<void> => {
  if (USE_COGNITO) {
    return cognitoLogout();
  }
  // モック版は何もしない
  return Promise.resolve();
};

// トークンリフレッシュ
export const refreshToken = async (refreshToken: string): Promise<AuthResponse> => {
  if (USE_COGNITO) {
    return cognitoRefreshToken(refreshToken);
  }
  // モック版は現在のトークンをそのまま返す
  throw new Error('トークンリフレッシュに失敗しました');
};

// パスワードリセット申請
export const forgotPassword = async (email: string): Promise<void> => {
  if (USE_COGNITO) {
    return cognitoForgotPassword(email);
  }
  // モック版は何もしない
  return Promise.resolve();
};

// パスワードリセット確認
export const confirmPassword = async (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  if (USE_COGNITO) {
    return cognitoConfirmPassword(email, code, newPassword);
  }
  // モック版は何もしない
  return Promise.resolve();
};

// ユーザー情報取得
export const getMe = async (): Promise<User> => {
  return apiRequest<User>({
    method: 'GET',
    url: '/users/me',
  });
};

// モックデータ（開発用）
// バックエンドAPI未完成時はこちらを使用
export const mockLogin = async (data: LoginRequest): Promise<AuthResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒遅延

  // テストユーザー
  if (data.email === 'customer@example.com' && data.password === 'password') {
    return {
      access_token: 'mock_access_token_customer',
      refresh_token: 'mock_refresh_token_customer',
      expires_in: 3600,
      user: {
        user_id: 'user_001',
        name: '山田太郎',
        email: 'customer@example.com',
        phone_number: '090-1234-5678',
        company_name: '株式会社サンプル',
        address: '東京都渋谷区',
        role: 'customer',
        created_at: new Date().toISOString(),
      },
    };
  }

  if (data.email === 'admin@example.com' && data.password === 'password') {
    return {
      access_token: 'mock_access_token_admin',
      refresh_token: 'mock_refresh_token_admin',
      expires_in: 3600,
      user: {
        user_id: 'user_002',
        name: 'スタジオ管理者',
        email: 'admin@example.com',
        phone_number: '090-8765-4321',
        address: '東京都渋谷区',
        role: 'admin',
        studio_id: 'studio_001',
        created_at: new Date().toISOString(),
      },
    };
  }

  if (data.email === 'staff@example.com' && data.password === 'password') {
    return {
      access_token: 'mock_access_token_staff',
      refresh_token: 'mock_refresh_token_staff',
      expires_in: 3600,
      user: {
        user_id: 'user_003',
        name: 'スタジオスタッフ',
        email: 'staff@example.com',
        phone_number: '090-5555-6666',
        address: '東京都渋谷区',
        role: 'staff',
        studio_id: 'studio_001',
        created_at: new Date().toISOString(),
      },
    };
  }

  throw new Error('メールアドレスまたはパスワードが正しくありません');
};

export const mockSignup = async (data: SignupRequest): Promise<AuthResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5秒遅延

  return {
    access_token: 'mock_access_token_new',
    refresh_token: 'mock_refresh_token_new',
    expires_in: 3600,
    user: {
      user_id: 'user_new_' + Date.now(),
      name: data.name,
      email: data.email,
      phone_number: data.phone_number,
      company_name: data.company_name,
      address: data.address,
      role: 'customer',
      created_at: new Date().toISOString(),
    },
  };
};

// プロフィール更新用の型定義
export interface UpdateProfileRequest {
  name?: string;
  phone_number?: string;
  company_name?: string;
  address?: string;
}

// パスワード変更用の型定義
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// プロフィール更新
export const updateProfile = async (userId: string, data: UpdateProfileRequest): Promise<User> => {
  return apiRequest<User>({
    method: 'PATCH',
    url: `/users/${userId}`,
    data,
  });
};

// パスワード変更
export const changePassword = async (userId: string, data: ChangePasswordRequest): Promise<void> => {
  return apiRequest<void>({
    method: 'POST',
    url: `/users/${userId}/change-password`,
    data,
  });
};

// モック: プロフィール更新
export const mockUpdateProfile = async (
  userId: string,
  data: UpdateProfileRequest
): Promise<User> => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms遅延

  // LocalStorageから現在のユーザー情報を取得
  const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
  const currentUser = authStorage.state?.user;

  if (!currentUser || currentUser.user_id !== userId) {
    throw new Error('ユーザー情報が見つかりません');
  }

  // 更新後のユーザー情報
  const updatedUser: User = {
    ...currentUser,
    ...data,
  };

  // LocalStorageを更新
  authStorage.state.user = updatedUser;
  localStorage.setItem('auth-storage', JSON.stringify(authStorage));

  return updatedUser;
};

// モック: パスワード変更
export const mockChangePassword = async (
  userId: string,
  data: ChangePasswordRequest
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒遅延

  // LocalStorageから現在のユーザー情報を取得
  const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
  const currentUser = authStorage.state?.user;

  if (!currentUser || currentUser.user_id !== userId) {
    throw new Error('ユーザー情報が見つかりません');
  }

  // 現在のパスワードチェック（モックでは常に"password"と仮定）
  if (data.current_password !== 'password') {
    throw new Error('現在のパスワードが正しくありません');
  }

  // 新しいパスワードのバリデーション
  if (data.new_password.length < 8) {
    throw new Error('新しいパスワードは8文字以上で入力してください');
  }

  // 実際のアプリではサーバー側でパスワードを更新
  // モックでは何もしない（LocalStorageにパスワードは保存しない）
  return;
};
