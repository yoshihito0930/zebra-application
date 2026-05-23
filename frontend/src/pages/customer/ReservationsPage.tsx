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
  Flex,
  Divider,
} from '@chakra-ui/react';
import { Eye, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyReservations } from '../../hooks/useReservations';
import type { Reservation } from '../../types';
import { calculateReservationTotal } from '../../utils/reservationPrice';
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

  const calculateTotal = (reservation: Reservation): number => {
    return Math.floor(calculateReservationTotal(reservation).total);
  };

  // 日付フォーマット (デスクトップ用)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // 日付フォーマット (モバイル用 — 短縮)
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]})`;
  };

  // 予約をステータス別にグループ化
  const groupedReservations = {
    upcoming: reservations.filter(
      (r) => ['pending', 'confirmed', 'tentative', 'scheduled', 'waitlisted'].includes(r.status)
    ),
    past: reservations.filter((r) => ['completed', 'cancelled', 'expired'].includes(r.status)),
  };

  const renderMobileCard = (reservation: Reservation, isPast = false) => (
    <Box
      key={reservation.reservation_id}
      bg="white"
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
      borderColor="gray.100"
      p={4}
      onClick={() => handleViewDetail(reservation.reservation_id)}
      cursor="pointer"
      _active={{ bg: 'gray.50' }}
      transition="background-color 0.1s ease"
      opacity={isPast ? 0.85 : 1}
    >
      <Flex justify="space-between" align="flex-start" mb={2}>
        <Box flex={1} minW={0}>
          <Text fontWeight="bold" fontSize="md" color={isPast ? 'gray.600' : 'gray.900'}>
            {formatDateShort(reservation.date)}
          </Text>
          <Text fontSize="sm" color="gray.600" mt={0.5}>
            {reservation.start_time} – {reservation.end_time}
          </Text>
        </Box>
        <ChevronRight size={18} color="var(--chakra-colors-gray-400)" />
      </Flex>

      <Divider my={2} />

      <VStack align="stretch" spacing={1.5}>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            プラン
          </Text>
          <Text fontSize="sm" fontWeight="medium" noOfLines={1} maxW="60%" textAlign="right">
            {reservation.plan_name}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            種別
          </Text>
          <Badge
            colorScheme="gray"
            variant={isPast ? 'outline' : 'subtle'}
            fontSize="10px"
          >
            {getReservationTypeLabel(reservation.reservation_type)}
          </Badge>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            ステータス
          </Text>
          <StatusBadge status={reservation.status} size="sm" />
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            料金
          </Text>
          <Text fontSize="md" fontWeight="bold" color={isPast ? 'gray.600' : 'gray.900'}>
            ¥{calculateTotal(reservation).toLocaleString()}
          </Text>
        </Flex>
      </VStack>
    </Box>
  );

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        {/* ヘッダー */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', md: 'flex-start' }}
          gap={{ base: 3, md: 0 }}
        >
          <Box>
            <Heading size={{ base: 'lg', md: 'xl' }} color="brand.600" mb={{ base: 1, md: 2 }}>
              予約一覧
            </Heading>
            <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
              あなたの予約を確認・管理できます
            </Text>
          </Box>
          <Button
            leftIcon={<CalendarIcon size={18} />}
            colorScheme="brand"
            onClick={() => navigate('/customer/calendar')}
            size={{ base: 'md', md: 'md' }}
            w={{ base: 'full', md: 'auto' }}
          >
            新規予約を作成
          </Button>
        </Flex>

        {/* ローディング・エラー表示 */}
        {isLoading && <LoadingSpinner />}

        {error && !isLoading && (
          <ErrorMessage
            message={error instanceof Error ? error.message : '予約一覧の取得に失敗しました'}
          />
        )}

        {/* 予約リスト */}
        {!isLoading && !error && (
          <>
            {/* 今後の予約 */}
            <Box
              bg={{ base: 'transparent', md: 'white' }}
              p={{ base: 0, md: 6 }}
              borderRadius={{ base: 0, md: 'lg' }}
              shadow={{ base: 'none', md: 'md' }}
            >
              <Heading size="md" mb={{ base: 3, md: 4 }} px={{ base: 1, md: 0 }}>
                今後の予約
              </Heading>

              {groupedReservations.upcoming.length === 0 ? (
                <Box
                  textAlign="center"
                  py={8}
                  bg={{ base: 'white', md: 'transparent' }}
                  borderRadius={{ base: 'lg', md: 0 }}
                  shadow={{ base: 'sm', md: 'none' }}
                >
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
                <>
                  {/* モバイル: カード表示 */}
                  <VStack
                    spacing={3}
                    align="stretch"
                    display={{ base: 'flex', md: 'none' }}
                  >
                    {groupedReservations.upcoming.map((r) => renderMobileCard(r, false))}
                  </VStack>

                  {/* デスクトップ: テーブル表示 */}
                  <TableContainer display={{ base: 'none', md: 'block' }}>
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
                              ¥{calculateTotal(reservation).toLocaleString()}
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
                </>
              )}
            </Box>

            {/* 過去の予約 */}
            {groupedReservations.past.length > 0 && (
              <Box
                bg={{ base: 'transparent', md: 'white' }}
                p={{ base: 0, md: 6 }}
                borderRadius={{ base: 0, md: 'lg' }}
                shadow={{ base: 'none', md: 'md' }}
              >
                <Heading size="md" mb={{ base: 3, md: 4 }} px={{ base: 1, md: 0 }}>
                  過去の予約
                </Heading>

                {/* モバイル: カード表示 */}
                <VStack
                  spacing={3}
                  align="stretch"
                  display={{ base: 'flex', md: 'none' }}
                >
                  {groupedReservations.past.map((r) => renderMobileCard(r, true))}
                </VStack>

                {/* デスクトップ: テーブル表示 */}
                <TableContainer display={{ base: 'none', md: 'block' }}>
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
                            ¥{calculateTotal(reservation).toLocaleString()}
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
