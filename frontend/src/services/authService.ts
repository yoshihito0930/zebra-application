import apiClient, { apiRequest } from './api';
import type { AuthResponse, LoginRequest, SignupRequest, User } from '../types';

// ログイン
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    method: 'POST',
    url: '/auth/login',
    data,
  });
};

// サインアップ
export const signup = async (data: SignupRequest): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    method: 'POST',
    url: '/auth/signup',
    data,
  });
};

// ユーザー情報取得
export const getMe = async (): Promise<User> => {
  return apiRequest<User>({
    method: 'GET',
    url: '/auth/me',
  });
};

// トークンリフレッシュ
export const refreshToken = async (refreshToken: string): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    method: 'POST',
    url: '/auth/refresh',
    data: { refresh_token: refreshToken },
  });
};

// ログアウト
export const logout = async (): Promise<void> => {
  return apiRequest<void>({
    method: 'POST',
    url: '/auth/logout',
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
