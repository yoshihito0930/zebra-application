import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

// ページコンポーネント（後で実装）
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CustomerCalendarPage from './pages/customer/CalendarPage';
import AdminDashboardPage from './pages/admin/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh" bg="gray.50">
        <Routes>
          {/* 認証画面 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 顧客向け画面 */}
          <Route path="/customer/calendar" element={<CustomerCalendarPage />} />

          {/* 管理者向け画面 */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

          {/* デフォルトルート */}
          <Route path="/" element={<Navigate to="/customer/calendar" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
