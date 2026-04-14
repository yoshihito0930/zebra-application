import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'customer' | 'admin' | 'staff';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  // 未認証の場合はログインページへリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ロール指定がある場合、ロールチェック
  if (requiredRole && user?.role !== requiredRole) {
    // 権限不足の場合、ロールに応じたページへリダイレクト
    if (user?.role === 'admin' || user?.role === 'staff') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/customer/calendar" replace />;
  }

  return <>{children}</>;
}
