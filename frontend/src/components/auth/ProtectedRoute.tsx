import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'customer' | 'admin' | 'staff';
  allowedRoles?: Array<'customer' | 'admin' | 'staff'>;
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  // 未認証の場合はログインページへリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // allowedRoles指定がある場合、複数ロールチェック
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
      // 権限不足の場合、ロールに応じたページへリダイレクト
      if (user?.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (user?.role === 'staff') {
        return <Navigate to="/staff/dashboard" replace />;
      }
      return <Navigate to="/customer/calendar" replace />;
    }
    return <>{children}</>;
  }

  // requiredRole指定がある場合、単一ロールチェック
  if (requiredRole && user?.role !== requiredRole) {
    // 権限不足の場合、ロールに応じたページへリダイレクト
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user?.role === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/customer/calendar" replace />;
  }

  return <>{children}</>;
}
