import { SimpleGrid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import KpiCard from './KpiCard';
import { formatRevenueShort } from '../../../utils/reservationGrouping';
import { calculateReservationTotal } from '../../../utils/reservationPrice';
import type { Reservation } from '../../../types';

interface KpiCardGridProps {
  todayCount: number;
  pendingCount: number;
  monthlyReservations: Reservation[];
}

export default function KpiCardGrid({ todayCount, pendingCount, monthlyReservations }: KpiCardGridProps) {
  const navigate = useNavigate();

  const monthlyRevenue = monthlyReservations
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + calculateReservationTotal(r).total, 0);

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
      <KpiCard label="今日の予約" value={todayCount} unit="件" tone="success" />
      <KpiCard
        label="承認待ち"
        value={pendingCount}
        unit="件"
        tone="warning"
        accentDot={pendingCount > 0}
        onClick={() => navigate('/admin/reservations?status=pending')}
      />
      {/* TODO(stats): backend 集計 API 完成後に「先月比」を実値に置換 */}
      <KpiCard
        label="今月の予約"
        value={monthlyReservations.length}
        unit="件"
        subText="先月比 +12%"
        subTextTone="positive"
      />
      <KpiCard
        label="今月の売上"
        value={formatRevenueShort(Math.floor(monthlyRevenue))}
        subText="先月比 +18%"
        subTextTone="positive"
      />
    </SimpleGrid>
  );
}
