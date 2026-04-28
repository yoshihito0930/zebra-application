import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import * as authService from '../services/authService';
import type { LoginRequest, SignupRequest } from '../types';

/**
 * 認証操作を一元管理するカスタムフック
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ログイン
   */
  const handleLogin = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);

      // 認証情報をストアに保存
      setAuth(response.user, response.access_token, response.refresh_token, response.expires_in);

      // ロールに応じてリダイレクト
      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.user.role === 'staff') {
        navigate('/staff/dashboard');
      } else {
        navigate('/customer/calendar');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * サインアップ
   */
  const handleSignup = async (data: SignupRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.signup(data);

      // サインアップ後、メール検証画面にリダイレクト
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アカウント登録に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * メール検証
   */
  const handleConfirmSignup = async (email: string, code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.confirmSignup(email, code);

      // 検証成功後、ログイン画面にリダイレクト
      navigate('/login?verified=true');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メール検証に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 検証コード再送
   */
  const handleResendConfirmationCode = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resendConfirmationCode(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '検証コードの再送に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ログアウト
   */
  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();

      // 認証情報をクリア
      clearAuth();

      // ログイン画面にリダイレクト
      navigate('/login');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログアウトに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * パスワードリセット申請
   */
  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email);

      // リセット申請成功後、パスワード再設定画面にリダイレクト
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'パスワードリセット申請に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * パスワードリセット確認
   */
  const handleConfirmPassword = async (email: string, code: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.confirmPassword(email, code, newPassword);

      // リセット成功後、ログイン画面にリダイレクト
      navigate('/login?reset=true');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'パスワードリセットに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * エラーをクリア
   */
  const clearError = () => {
    setError(null);
  };

  return {
    // 状態
    user,
    isAuthenticated,
    isLoading,
    error,

    // アクション
    login: handleLogin,
    signup: handleSignup,
    confirmSignup: handleConfirmSignup,
    resendConfirmationCode: handleResendConfirmationCode,
    logout: handleLogout,
    forgotPassword: handleForgotPassword,
    confirmPassword: handleConfirmPassword,
    clearError,
  };
};
