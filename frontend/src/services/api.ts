import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { APIError } from '../types';
import { useAuthStore } from '../stores/authStore';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Axiosインスタンス作成
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 埋め込みウィジェットからベースURLを実行時に注入するためのセッター。
// SPA はビルド時の VITE_API_BASE_URL を使うため呼び出さない。
export const setApiBaseUrl = (url: string) => {
  apiClient.defaults.baseURL = url;
};

// 埋め込みモードフラグ。true の間は 401 検出時にホストページのナビゲーションを
// 乗っ取らない（window.location.href によるリダイレクトを抑止する）。
let embeddedMode = false;
export const setEmbeddedMode = (value: boolean) => {
  embeddedMode = value;
};

// リクエストインターセプター（認証トークン付与）
apiClient.interceptors.request.use(
  (config) => {
    // LocalStorageからトークンを取得
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 検出時にリダイレクトしないページ。ログイン処理自体の 401（パスワード誤りなど）や、
// ゲストでも閲覧する画面で誤ってログイン画面に飛ばさないようにする。
const SESSION_EXPIRY_EXEMPT_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/reservations/guest',
];

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<APIError>) => {
    // 401エラー（トークン期限切れ・無効）の場合、認証状態をクリアしてログイン画面へ
    if (error.response?.status === 401) {
      // 埋め込みモードではホストのナビゲーションを乗っ取らない
      if (embeddedMode) {
        return Promise.reject(error);
      }
      const path = window.location.pathname;
      const onExemptPage = SESSION_EXPIRY_EXEMPT_PATHS.some((p) => path.startsWith(p));
      if (!onExemptPage) {
        // Zustand store ごとクリア（localStorage 直消しだと isAuthenticated が残る）
        useAuthStore.getState().clearAuth();
        window.location.href = '/login?session_expired=1';
      }
    }

    // エラーメッセージの整形
    const apiError = error.response?.data;
    if (apiError?.error) {
      console.error('[API Error]', apiError.error);
    }

    return Promise.reject(error);
  }
);

// APIクライアントをエクスポート
export default apiClient;

// APIエラーからメッセージを取得するヘルパー関数
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError | undefined;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '不明なエラーが発生しました';
};

// APIエラーからエラーコード（error.code）を取得するヘルパー関数
// バックエンドの { error: { code, message } } 形式に対応。
// 取得できない場合は undefined を返す。
export const getErrorCode = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError | undefined;
    return apiError?.error?.code;
  }
  return undefined;
};

// APIリクエストのラッパー関数
export const apiRequest = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.request<T>(config);
  return response.data;
};
