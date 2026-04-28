import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // トークンの有効期限（Unix timestamp）
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn?: number) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  refreshAccessToken: (newAccessToken: string, newRefreshToken: string, expiresIn?: number) => void;
  isTokenExpired: () => boolean;
}

// 認証ストア（LocalStorageに永続化）
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,

      // 認証情報を設定
      setAuth: (user, accessToken, refreshToken, expiresIn = 3600) => {
        const expiresAt = Date.now() + expiresIn * 1000; // expiresInは秒単位なのでミリ秒に変換

        set({
          user,
          accessToken,
          refreshToken,
          expiresAt,
          isAuthenticated: true,
        });

        // LocalStorageにもトークンを保存（APIクライアントで使用）
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('expires_at', expiresAt.toString());
      },

      // ユーザー情報を設定
      setUser: (user) => {
        set({ user });
      },

      // 認証情報をクリア（ログアウト時）
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
        });

        // LocalStorageからも削除
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expires_at');
        localStorage.removeItem('user');
      },

      // ユーザー情報を更新
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      // アクセストークンをリフレッシュ
      refreshAccessToken: (newAccessToken, newRefreshToken, expiresIn = 3600) => {
        const expiresAt = Date.now() + expiresIn * 1000;

        set({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt,
        });

        // LocalStorageも更新
        localStorage.setItem('access_token', newAccessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        localStorage.setItem('expires_at', expiresAt.toString());
      },

      // トークンが期限切れかチェック
      isTokenExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return true;

        // 有効期限の5分前に期限切れとみなす（リフレッシュの猶予を持たせる）
        return Date.now() >= expiresAt - 5 * 60 * 1000;
      },
    }),
    {
      name: 'auth-storage', // LocalStorageのキー名
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
