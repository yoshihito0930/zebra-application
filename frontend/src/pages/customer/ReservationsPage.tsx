import {
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { Eye, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyReservations } from '../../hooks/useReservations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function ReservationsPage() {
  const navigate = useNavigate();

  // React Queryで予約一覧取得
  const { data: reservations = [], isLoading, error } = useMyReservations();

  // 予約種別のラベル
  const getReservationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: '本予約',
      tentative: '仮予約',
      location_scout: 'ロケハン',
      second_keep: '第2キープ',
    };
    return labels[type] || type;
  };

  // 予約詳細へ遷移
  const handleViewDetail = (reservationId: string) => {
    navigate(`/customer/reservations/${reservationId}`);
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // 予約をステータス別にグループ化
  const groupedReservations = {
    upcoming: reservations.filter(
      (r) => ['pending', 'confirmed', 'tentative', 'scheduled', 'waitlisted'].includes(r.status)
    ),
    past: reservations.filter((r) => ['completed', 'cancelled', 'expired'].includes(r.status)),
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading size="xl" color="brand.600" mb={2}>
              予約一覧
            </Heading>
            <Text color="gray.600">あなたの予約を確認・管理できます</Text>
          </Box>
          <Button
            leftIcon={<CalendarIcon size={18} />}
            colorScheme="brand"
            onClick={() => navigate('/customer/calendar')}
          >
            新規予約を作成
          </Button>
        </HStack>

        {/* ローディング・エラー表示 */}
        {isLoading && <LoadingSpinner />}

        {error && !isLoading && <ErrorMessage message={error instanceof Error ? error.message : '予約一覧の取得に失敗しました'} />}

        {/* 予約リスト */}
        {!isLoading && !error && (
          <>
            {/* 今後の予約 */}
            <Box bg="white" p={6} borderRadius="lg" shadow="md">
              <Heading size="md" mb={4}>
                今後の予約
              </Heading>

              {groupedReservations.upcoming.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500" mb={4}>
                    予約がありません
                  </Text>
                  <Button
                    leftIcon={<CalendarIcon size={18} />}
                    colorScheme="brand"
                    onClick={() => navigate('/customer/calendar')}
                  >
                    カレンダーから予約する
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>日時</Th>
                        <Th>時間</Th>
                        <Th>プラン</Th>
                        <Th>種別</Th>
                        <Th>ステータス</Th>
                        <Th>料金</Th>
                        <Th>操作</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {groupedReservations.upcoming.map((reservation) => (
                        <Tr key={reservation.reservation_id}>
                          <Td>{formatDate(reservation.date)}</Td>
                          <Td>
                            {reservation.start_time} - {reservation.end_time}
                          </Td>
                          <Td>{reservation.plan_name}</Td>
                          <Td>
                            <Badge colorScheme="gray">
                              {getReservationTypeLabel(reservation.reservation_type)}
                            </Badge>
                          </Td>
                          <Td>
                            <StatusBadge status={reservation.status} />
                          </Td>
                          <Td fontWeight="medium">
                            ¥
                            {(
                              reservation.plan_price +
                              reservation.options.reduce((sum, opt) => sum + opt.price, 0)
                            ).toLocaleString()}
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Tooltip label="詳細を見る" placement="top">
                                <IconButton
                                  aria-label="詳細を見る"
                                  icon={<Eye size={18} />}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewDetail(reservation.reservation_id)}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* 過去の予約 */}
            {groupedReservations.past.length > 0 && (
              <Box bg="white" p={6} borderRadius="lg" shadow="md">
                <Heading size="md" mb={4}>
                  過去の予約
                </Heading>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>日時</Th>
                        <Th>時間</Th>
                        <Th>プラン</Th>
                        <Th>種別</Th>
                        <Th>ステータス</Th>
                        <Th>料金</Th>
                        <Th>操作</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {groupedReservations.past.map((reservation) => (
                        <Tr key={reservation.reservation_id}>
                          <Td color="gray.500">{formatDate(reservation.date)}</Td>
                          <Td color="gray.500">
                            {reservation.start_time} - {reservation.end_time}
                          </Td>
                          <Td color="gray.500">{reservation.plan_name}</Td>
                          <Td>
                            <Badge colorScheme="gray" variant="outline">
                              {getReservationTypeLabel(reservation.reservation_type)}
                            </Badge>
                          </Td>
                          <Td>
                            <StatusBadge status={reservation.status} />
                          </Td>
                          <Td color="gray.500">
                            ¥
                            {(
                              reservation.plan_price +
                              reservation.options.reduce((sum, opt) => sum + opt.price, 0)
                            ).toLocaleString()}
                          </Td>
                          <Td>
                            <Tooltip label="詳細を見る" placement="top">
                              <IconButton
                                aria-label="詳細を見る"
                                icon={<Eye size={18} />}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDetail(reservation.reservation_id)}
                              />
                            </Tooltip>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </VStack>
    </Container>
  );
}
