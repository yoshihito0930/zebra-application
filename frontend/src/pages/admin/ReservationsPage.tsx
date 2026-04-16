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
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  IconButton,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Eye, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAllReservations } from '../../hooks/useReservations';
import type { Reservation } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReservationApprovalDialog } from '../../components/admin/ReservationApprovalDialog';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export const ReservationsPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  // React Queryで全予約取得
  const { data: filteredReservations = [], isLoading, error } = useAllReservations(STUDIO_ID, statusFilter);

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
    const planTotal = reservation.plan_price * (1 + reservation.plan_tax_rate);
    const optionsTotal = reservation.options.reduce(
      (sum, opt) => sum + opt.price * (1 + opt.tax_rate),
      0
    );
    return Math.floor(planTotal + optionsTotal);
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
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={6}>
        <Heading size="lg" mb={4}>
          予約管理
        </Heading>
        <HStack spacing={4}>
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
                      <Text fontSize="sm">ユーザーID: {reservation.user_id}</Text>
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

      {selectedReservation && (
        <ReservationApprovalDialog
          isOpen={isOpen}
          onClose={onClose}
          reservation={selectedReservation}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </Container>
  );
};
