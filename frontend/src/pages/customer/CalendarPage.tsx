import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import EmbeddedCalendar from '../../components/calendar/EmbeddedCalendar';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

/**
 * SPA の予約カレンダーページ。
 * 描画本体は EmbeddedCalendar に集約し、ここでは SPA 固有の
 * ルーター遷移・認証ストアの結合のみを担う。
 */
export default function CalendarPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <EmbeddedCalendar
      studioId={STUDIO_ID}
      isAuthenticated={isAuthenticated}
      showChrome
      onNavigateSignup={() => navigate('/signup')}
      onNavigateMyReservations={() => navigate('/customer/reservations')}
    />
  );
}
