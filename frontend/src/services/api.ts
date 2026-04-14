import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { APIError } from '../types';

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

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<APIError>) => {
    // 401エラー（未認証）の場合、ログイン画面へリダイレクト
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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

// APIリクエストのラッパー関数
export const apiRequest = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.request<T>(config);
  return response.data;
};
