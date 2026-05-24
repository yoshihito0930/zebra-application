import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import MiniCalendar from './MiniCalendar';
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
  /** 表示月で絞り込み済みの予約。フィルタチップ・日付グループ・スクロール対象。 */
  visibleReservations: Reservation[];
  /** 全期間の予約。isNewReservation 判定用にのみ参照。 */
  allReservations: Reservation[];
  todayCount: number;
  pendingCount: number;
  monthlyReservations: Reservation[];
  pendingDateSet: Set<string>;
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
  onCardClick: (id: string) => void;
  onApprovalClick: (reservation: Reservation) => void;
}

export default function MobileAdminDashboard({
  visibleReservations,
  allReservations,
  todayCount,
  pendingCount,
  monthlyReservations,
  pendingDateSet,
  viewYear,
  viewMonth,
  onMonthChange,
  onCardClick,
  onApprovalClick,
}: MobileAdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [pendingScrollDate, setPendingScrollDate] = useState<string | null>(null);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const counts = useMemo(() => countByTab(visibleReservations), [visibleReservations]);
  const filtered = useMemo(
    () => filterByTab(visibleReservations, activeTab),
    [visibleReservations, activeTab]
  );
  const groups = useMemo(() => groupReservationsByDate(filtered, 'asc'), [filtered]);

  const reservedDateSet = useMemo(
    () => new Set(visibleReservations.map((r) => r.date)),
    [visibleReservations]
  );

  const monthlyRevenue = useMemo(
    () =>
      monthlyReservations
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + calculateReservationTotal(r).total, 0),
    [monthlyReservations]
  );

  const scrollToDate = useCallback((date: string) => {
    const el = groupRefs.current.get(date);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // ハイライトは描画直後の rAF 内で設定し、effect 内同期 setState を避ける
    window.requestAnimationFrame(() => setHighlightDate(date));
    window.setTimeout(() => {
      setHighlightDate((current) => (current === date ? null : current));
    }, 1800);
    return true;
  }, []);

  const handleCalendarDateClick = useCallback(
    (date: string) => {
      if (!reservedDateSet.has(date)) return;
      // 現在のタブで対象日付が見つからない場合は 'all' に切り替えてからスクロール
      const visibleNow = groups.some((g) => g.date === date);
      if (!visibleNow && activeTab !== 'all') {
        setActiveTab('all');
        setPendingScrollDate(date);
        return;
      }
      scrollToDate(date);
    },
    [reservedDateSet, groups, activeTab, scrollToDate]
  );

  // タブ切替後の再レンダリングで groups が更新されたらスクロール実行
  // setState は rAF 内で呼ぶことで effect 内同期 setState のルール違反を回避
  useEffect(() => {
    if (!pendingScrollDate) return;
    const visible = groups.some((g) => g.date === pendingScrollDate);
    if (!visible) return;
    const target = pendingScrollDate;
    const raf = window.requestAnimationFrame(() => {
      scrollToDate(target);
      setPendingScrollDate(null);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pendingScrollDate, groups, scrollToDate]);

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

      {/* ミニカレンダー */}
      <MiniCalendar
        pendingDateSet={pendingDateSet}
        onDateClick={handleCalendarDateClick}
        onMonthChange={onMonthChange}
      />

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
          {viewYear}年{viewMonth}月に表示できる予約はありません
        </Alert>
      ) : (
        <VStack align="stretch" spacing={5}>
          {groups.map((group) => {
            const isToday = group.label.includes('今日');
            // ラベルから "今日" / "明日" を取り除いて表示部分を整える
            const displayLabel = group.label.replace(' 今日 ', ' ').replace(' 明日 ', ' ');
            const isHighlighted = highlightDate === group.date;
            return (
              <Box
                key={group.date}
                ref={(el) => {
                  if (el) groupRefs.current.set(group.date, el);
                  else groupRefs.current.delete(group.date);
                }}
                scrollMarginTop="12px"
                borderRadius="lg"
                transition="background-color 0.4s ease, box-shadow 0.4s ease"
                bg={isHighlighted ? 'brand.50' : 'transparent'}
                boxShadow={isHighlighted ? '0 0 0 2px var(--chakra-colors-brand-200)' : 'none'}
                p={isHighlighted ? 2 : 0}
                mx={isHighlighted ? -2 : 0}
              >
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
