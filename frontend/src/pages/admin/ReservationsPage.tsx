import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  HStack,
  useBreakpointValue,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  IconButton,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Eye, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAllReservations } from '../../hooks/useReservations';
import type { Reservation } from '../../types';
import { calculateReservationTotal } from '../../utils/reservationPrice';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReservationApprovalDialog } from '../../components/admin/ReservationApprovalDialog';
import MobileReservationCard from '../../components/admin/dashboard/MobileReservationCard';
import ReservationStatusTabs from '../../components/admin/dashboard/ReservationStatusTabs';
import { TAB_KEYS, type TabKey } from '../../utils/reservationGrouping';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

const OTHER_STATUSES = new Set(['waitlisted', 'scheduled', 'cancelled', 'expired', 'completed']);

const isTabKey = (s: string): s is TabKey => (TAB_KEYS as string[]).includes(s);

export const ReservationsPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'future' | 'past'>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });

  // モバイルのフィルタチップ用に statusFilter を TabKey 5値に丸める
  const mobileTabValue: TabKey = isTabKey(statusFilter)
    ? statusFilter
    : OTHER_STATUSES.has(statusFilter)
    ? 'other'
    : 'all';

  const handleMobileTabChange = (next: TabKey) => {
    setStatusFilter(next === 'other' ? 'other' : next);
  };

  // 「全期間」前提でAPI取得し、'other' タブはクライアントで絞り込む
  const apiStatusParam = statusFilter === 'other' ? 'all' : statusFilter;
  const { data: apiReservations = [], isLoading, error } = useAllReservations(
    STUDIO_ID,
    apiStatusParam,
    dateRangeFilter
  );

  const filteredReservations =
    statusFilter === 'other'
      ? apiReservations.filter((r) => OTHER_STATUSES.has(r.status))
      : apiReservations;

  const mobileTabCounts: Record<TabKey, number> = {
    all: apiReservations.length,
    pending: apiReservations.filter((r) => r.status === 'pending').length,
    confirmed: apiReservations.filter((r) => r.status === 'confirmed').length,
    tentative: apiReservations.filter((r) => r.status === 'tentative').length,
    other: apiReservations.filter((r) => OTHER_STATUSES.has(r.status)).length,
  };

  const handleApprovalClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    onOpen();
  };

  const handleApprovalSuccess = () => {
    // React Queryが自動的に再取得
    onClose();
  };

  const handleViewDetail = (id: string) => {
    navigate(`/admin/reservations/${id}`);
  };

  const calculateTotal = (reservation: Reservation): number => {
    return Math.floor(calculateReservationTotal(reservation).total);
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>読み込み中...</Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {error instanceof Error ? error.message : '予約の取得に失敗しました'}
        </Alert>
      </Container>
    );
  }

  const approvalDialog = selectedReservation && (
    <ReservationApprovalDialog
      isOpen={isOpen}
      onClose={onClose}
      reservation={selectedReservation}
      onSuccess={handleApprovalSuccess}
    />
  );

  if (isMobile) {
    return (
      <>
        <VStack align="stretch" spacing={4}>
          <Box>
            <Heading size="md" mb={3}>
              予約管理
            </Heading>
            <ReservationStatusTabs
              value={mobileTabValue}
              onChange={handleMobileTabChange}
              counts={mobileTabCounts}
              scrollable
            />
            <HStack spacing={3} mt={3} flexWrap="wrap">
              <Select
                value={dateRangeFilter}
                onChange={(e) =>
                  setDateRangeFilter(e.target.value as 'all' | 'future' | 'past')
                }
                size="sm"
                maxW="180px"
              >
                <option value="all">すべての期間</option>
                <option value="future">未来の予約</option>
                <option value="past">過去の予約</option>
              </Select>
              <Text fontSize="xs" color="gray.600">
                {filteredReservations.length}件
              </Text>
            </HStack>
          </Box>

          {filteredReservations.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              予約がありません
            </Alert>
          ) : (
            <VStack align="stretch" spacing={2}>
              {filteredReservations.map((reservation) => (
                <MobileReservationCard
                  key={reservation.reservation_id}
                  reservation={reservation}
                  onCardClick={handleViewDetail}
                  onApprovalClick={handleApprovalClick}
                />
              ))}
            </VStack>
          )}
        </VStack>
        {approvalDialog}
      </>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={6}>
        <Heading size="lg" mb={4}>
          予約管理
        </Heading>
        <HStack spacing={4} flexWrap="wrap">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="300px"
          >
            <option value="all">すべて</option>
            <option value="pending">承認待ち</option>
            <option value="confirmed">本予約</option>
            <option value="tentative">仮予約</option>
            <option value="scheduled">ロケハン</option>
            <option value="waitlisted">第2キープ</option>
            <option value="cancelled">キャンセル</option>
            <option value="completed">完了</option>
            <option value="expired">期限切れ</option>
          </Select>
          <Select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as 'all' | 'future' | 'past')}
            maxW="200px"
          >
            <option value="all">すべての期間</option>
            <option value="future">未来の予約</option>
            <option value="past">過去の予約</option>
          </Select>
          <Text fontSize="sm" color="gray.600">
            {filteredReservations.length}件の予約
          </Text>
        </HStack>
      </Box>

      {filteredReservations.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          予約がありません
        </Alert>
      ) : (
        <Box overflowX="auto" borderWidth={1} borderRadius="md">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>予約ID</Th>
                <Th>予約者</Th>
                <Th>日時</Th>
                <Th>時間</Th>
                <Th>プラン</Th>
                <Th>種別</Th>
                <Th>ステータス</Th>
                <Th isNumeric>料金</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredReservations.map((reservation) => (
                <Tr key={reservation.reservation_id}>
                  <Td fontFamily="mono" fontSize="sm">
                    {reservation.reservation_id}
                  </Td>
                  <Td>
                    {reservation.is_guest ? (
                      <Box>
                        <Text fontWeight="bold">{reservation.guest_name || 'ゲスト'}</Text>
                        <Text fontSize="xs" color="gray.600">
                          {reservation.guest_email}
                        </Text>
                        <Text fontSize="xs" color="orange.600">
                          ゲスト予約
                        </Text>
                      </Box>
                    ) : (
                      <Box>
                        <Text fontWeight="bold">{reservation.user_name || reservation.user_id}</Text>
                        <Text fontSize="xs" color="gray.600">
                          {reservation.user_email || '-'}
                        </Text>
                        <Text fontSize="xs" color="blue.600">
                          会員予約
                        </Text>
                      </Box>
                    )}
                  </Td>
                  <Td>
                    {format(new Date(reservation.date), 'M月d日(E)', { locale: ja })}
                  </Td>
                  <Td fontSize="sm">
                    {reservation.start_time} - {reservation.end_time}
                  </Td>
                  <Td>
                    <Text fontSize="sm">{reservation.plan_name}</Text>
                    {reservation.options.length > 0 && (
                      <Text fontSize="xs" color="gray.600">
                        +{reservation.options.length}オプション
                      </Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="sm">
                      {reservation.reservation_type === 'regular' && '本予約'}
                      {reservation.reservation_type === 'tentative' && '仮予約'}
                      {reservation.reservation_type === 'location_scout' && 'ロケハン'}
                      {reservation.reservation_type === 'second_keep' && '第2キープ'}
                    </Text>
                  </Td>
                  <Td>
                    <StatusBadge status={reservation.status} size="sm" />
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    ¥{calculateTotal(reservation).toLocaleString()}
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="詳細表示"
                        icon={<Eye size={18} />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetail(reservation.reservation_id)}
                      />
                      {reservation.status === 'pending' && (
                        <IconButton
                          aria-label="承認・拒否"
                          icon={<CheckCircle size={18} />}
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          onClick={() => handleApprovalClick(reservation)}
                        />
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {approvalDialog}
    </Container>
  );
};
