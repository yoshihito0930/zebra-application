import { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobilePageHeader from './MobilePageHeader';
import MobileKpiTile from './MobileKpiTile';
import MobileReservationCard from './MobileReservationCard';
import ReservationStatusTabs from './ReservationStatusTabs';
import {
  countByTab,
  filterByTab,
  formatRevenueShort,
  groupReservationsByDate,
  isNewReservation,
  type TabKey,
} from '../../../utils/reservationGrouping';
import { calculateReservationTotal } from '../../../utils/reservationPrice';
import type { Reservation } from '../../../types';

interface MobileAdminDashboardProps {
  allReservations: Reservation[];
  todayCount: number;
  pendingCount: number;
  monthlyReservations: Reservation[];
  onCardClick: (id: string) => void;
  onApprovalClick: (reservation: Reservation) => void;
}

export default function MobileAdminDashboard({
  allReservations,
  todayCount,
  pendingCount,
  monthlyReservations,
  onCardClick,
  onApprovalClick,
}: MobileAdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const counts = useMemo(() => countByTab(allReservations), [allReservations]);
  const filtered = useMemo(
    () => filterByTab(allReservations, activeTab),
    [allReservations, activeTab]
  );
  const groups = useMemo(() => groupReservationsByDate(filtered, 'asc'), [filtered]);

  const monthlyRevenue = useMemo(
    () =>
      monthlyReservations
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + calculateReservationTotal(r).total, 0),
    [monthlyReservations]
  );

  return (
    <VStack align="stretch" spacing={4}>
      <MobilePageHeader />

      {/* 要対応バナー */}
      {pendingCount > 0 && (
        <Box bg="red.500" borderRadius="xl" px={4} py={4} color="white" shadow="sm">
          <HStack spacing={3} align="center">
            <Box
              w="44px"
              h="44px"
              borderRadius="full"
              bg="whiteAlpha.300"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <AlertTriangle size={22} />
            </Box>
            <Box flex={1} minW={0}>
              <Text fontSize="xs" fontWeight="medium" opacity={0.9}>
                要対応
              </Text>
              <Text fontSize="lg" fontWeight="bold" lineHeight="1.2">
                {pendingCount}件の予約申請
              </Text>
            </Box>
            <Button
              size="sm"
              bg="white"
              color="red.500"
              _hover={{ bg: 'gray.100' }}
              _active={{ bg: 'gray.200' }}
              fontWeight="bold"
              onClick={() => navigate('/admin/reservations?status=pending')}
            >
              確認
            </Button>
          </HStack>
        </Box>
      )}

      {/* KPIタイル (3つ横並び) */}
      <SimpleGrid columns={3} spacing={2}>
        <MobileKpiTile label="今日" value={todayCount} valueColor="green.500" />
        <MobileKpiTile label="今月" value={monthlyReservations.length} />
        <MobileKpiTile label="今月売上" value={formatRevenueShort(Math.floor(monthlyRevenue))} />
      </SimpleGrid>

      {/* フィルタチップ */}
      <ReservationStatusTabs
        value={activeTab}
        onChange={setActiveTab}
        counts={counts}
        scrollable
      />

      {/* 予約リスト */}
      {groups.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          表示できる予約がありません
        </Alert>
      ) : (
        <VStack align="stretch" spacing={5}>
          {groups.map((group) => {
            const isToday = group.label.includes('今日');
            // ラベルから "今日" / "明日" を取り除いて表示部分を整える
            const displayLabel = group.label.replace(' 今日 ', ' ').replace(' 明日 ', ' ');
            return (
              <Box key={group.date}>
                <HStack spacing={2} mb={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color={isToday ? 'green.600' : 'gray.700'}
                  >
                    {displayLabel}
                  </Text>
                  {isToday && (
                    <Badge
                      colorScheme="green"
                      borderRadius="full"
                      px={2}
                      py={0.5}
                      fontSize="10px"
                    >
                      今日
                    </Badge>
                  )}
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {group.reservations.map((r) => (
                    <MobileReservationCard
                      key={r.reservation_id}
                      reservation={r}
                      isNew={isNewReservation(r, allReservations)}
                      onCardClick={onCardClick}
                      onApprovalClick={onApprovalClick}
                    />
                  ))}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
