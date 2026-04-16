import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Button,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
} from '@chakra-ui/react';
import { Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTodayReservations, useAllReservations } from '../../hooks/useReservations';
import { StatusBadge } from '../../components/common/StatusBadge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Reservation } from '../../types';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export default function DashboardPage() {
  const navigate = useNavigate();

  // 今日の予約を取得
  const { data: todayReservations = [], isLoading: isTodayLoading } = useTodayReservations(STUDIO_ID);

  // 承認待ちの予約を取得
  const { data: pendingReservations = [] } = useAllReservations(STUDIO_ID, 'pending');

  // 今月の予約を取得（全体）
  const { data: allReservations = [] } = useAllReservations(STUDIO_ID, 'all');

  // 今月の予約数を計算
  const thisMonth = new Date().getMonth() + 1;
  const thisYear = new Date().getFullYear();
  const monthlyReservations = allReservations.filter((r) => {
    const reservationDate = new Date(r.date);
    return (
      reservationDate.getMonth() + 1 === thisMonth &&
      reservationDate.getFullYear() === thisYear
    );
  });

  // 予約詳細へ遷移
  const handleReservationClick = (id: string) => {
    navigate(`/staff/reservations/${id}`);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            スタッフダッシュボード
          </Heading>
          <Text color="gray.600">
            予約の確認ができます
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">今日の予約</StatLabel>
              <StatNumber color="brand.600">{todayReservations.length}件</StatNumber>
            </Stat>
          </Box>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">承認待ち</StatLabel>
              <StatNumber color="orange.500">{pendingReservations.length}件</StatNumber>
            </Stat>
          </Box>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">今月の予約</StatLabel>
              <StatNumber color="brand.600">{monthlyReservations.length}件</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* 今日の予約一覧 */}
        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <HStack justify="space-between" mb={4}>
            <HStack spacing={2}>
              <Clock size={20} />
              <Heading size="md">今日の予約</Heading>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {format(new Date(), 'M月d日(E)', { locale: ja })}
            </Text>
          </HStack>

          {isTodayLoading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" />
              <Text mt={2} color="gray.500">
                読み込み中...
              </Text>
            </Box>
          ) : todayReservations.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              今日の予約はありません
            </Alert>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>時間</Th>
                    <Th>予約者</Th>
                    <Th>プラン</Th>
                    <Th>ステータス</Th>
                    <Th>種別</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {todayReservations.map((reservation: Reservation) => (
                    <Tr
                      key={reservation.reservation_id}
                      cursor="pointer"
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => handleReservationClick(reservation.reservation_id)}
                    >
                      <Td fontWeight="medium">
                        {reservation.start_time} - {reservation.end_time}
                      </Td>
                      <Td>
                        {reservation.is_guest ? (
                          <Box>
                            <Text fontSize="sm" fontWeight="medium">
                              {reservation.guest_name || 'ゲスト'}
                            </Text>
                            <Badge colorScheme="orange" fontSize="xs">
                              ゲスト
                            </Badge>
                          </Box>
                        ) : (
                          <Box>
                            <Text fontSize="sm" fontWeight="medium">
                              {reservation.user_name || reservation.user_id}
                            </Text>
                            <Badge colorScheme="blue" fontSize="xs">
                              会員
                            </Badge>
                          </Box>
                        )}
                      </Td>
                      <Td>
                        <Text fontSize="sm">{reservation.plan_name}</Text>
                      </Td>
                      <Td>
                        <StatusBadge status={reservation.status} size="sm" />
                      </Td>
                      <Td>
                        <Text fontSize="sm">
                          {reservation.reservation_type === 'regular' && '本予約'}
                          {reservation.reservation_type === 'tentative' && '仮予約'}
                          {reservation.reservation_type === 'location_scout' && 'ロケハン'}
                          {reservation.reservation_type === 'second_keep' && '第2キープ'}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        <Box bg="white" p={8} borderRadius="lg" shadow="md">
          <Heading size="md" mb={4}>
            クイックアクション
          </Heading>
          <HStack spacing={4} flexWrap="wrap">
            <Button
              leftIcon={<Calendar size={18} />}
              colorScheme="brand"
              onClick={() => navigate('/staff/calendar')}
            >
              カレンダーを見る
            </Button>
            <Button
              leftIcon={<Calendar size={18} />}
              colorScheme="brand"
              variant="outline"
              onClick={() => navigate('/staff/reservations')}
            >
              全予約を見る
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Container>
  );
}
