import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

// ページコンポーネント
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CustomerCalendarPage from './pages/customer/CalendarPage';
import ReservationsPage from './pages/customer/ReservationsPage';
import ReservationDetailPage from './pages/customer/ReservationDetailPage';
import ProfilePage from './pages/customer/ProfilePage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminCalendarPage from './pages/admin/CalendarPage';
import { ReservationsPage as AdminReservationsPage } from './pages/admin/ReservationsPage';
import { ReservationDetailPage as AdminReservationDetailPage } from './pages/admin/ReservationDetailPage';
import StaffDashboardPage from './pages/staff/DashboardPage';
import StaffCalendarPage from './pages/staff/CalendarPage';
import { ReservationsPage as StaffReservationsPage } from './pages/staff/ReservationsPage';
import { ReservationDetailPage as StaffReservationDetailPage } from './pages/staff/ReservationDetailPage';
import GuestReservationVerifyPage from './pages/guest/GuestReservationVerifyPage';
import GuestReservationDetailPage from './pages/guest/GuestReservationDetailPage';

// 認証ガード
import ProtectedRoute from './components/auth/ProtectedRoute';

// レイアウト
import CustomerLayout from './components/layouts/CustomerLayout';
import AdminLayout from './components/layouts/AdminLayout';
import StaffLayout from './components/layouts/StaffLayout';

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh" bg="gray.50">
        <Routes>
          {/* 認証画面（レイアウトなし） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 顧客向け画面 */}
          <Route
            path="/customer/calendar"
            element={
              <CustomerLayout>
                <CustomerCalendarPage />
              </CustomerLayout>
            }
          />
          <Route
            path="/customer/reservations"
            element={
              <ProtectedRoute>
                <CustomerLayout>
                  <ReservationsPage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/reservations/:id"
            element={
              <ProtectedRoute>
                <CustomerLayout>
                  <ReservationDetailPage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/inquiries"
            element={
              <ProtectedRoute>
                <CustomerLayout>
                  {/* 問い合わせページは後で実装 */}
                  <Box p={8}>問い合わせページ（実装予定）</Box>
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute>
                <CustomerLayout>
                  <ProfilePage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          {/* 管理者向け画面（すべて認証必要） */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminCalendarPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reservations"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminReservationsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reservations/:id"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminReservationDetailPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* スタッフ向け画面（すべて認証必要） */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffLayout>
                  <StaffDashboardPage />
                </StaffLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/calendar"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffLayout>
                  <StaffCalendarPage />
                </StaffLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/reservations"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffLayout>
                  <StaffReservationsPage />
                </StaffLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/reservations/:id"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffLayout>
                  <StaffReservationDetailPage />
                </StaffLayout>
              </ProtectedRoute>
            }
          />

          {/* ゲスト予約確認（認証不要） */}
          <Route path="/reservations/guest/verify" element={<GuestReservationVerifyPage />} />
          <Route path="/reservations/guest/:token" element={<GuestReservationDetailPage />} />

          {/* デフォルトルート */}
          <Route path="/" element={<Navigate to="/customer/calendar" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
