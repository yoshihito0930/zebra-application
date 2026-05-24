import { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  useBreakpointValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAllReservations } from '../../hooks/useReservations';
import { ReservationApprovalDialog } from '../../components/admin/ReservationApprovalDialog';
import CreateReservationModal from '../../components/reservation/CreateReservationModal';
import KpiCardGrid from '../../components/admin/dashboard/KpiCardGrid';
import MiniCalendar from '../../components/admin/dashboard/MiniCalendar';
import UrgentAlertCard from '../../components/admin/dashboard/UrgentAlertCard';
import ReservationListSection from '../../components/admin/dashboard/ReservationListSection';
import MobileAdminDashboard from '../../components/admin/dashboard/MobileAdminDashboard';
import type { Reservation } from '../../types';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export default function DashboardPage() {
  const navigate = useNavigate();
  const createModal = useDisclosure();
  const approvalDialog = useDisclosure();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });

  const { data: allReservations = [], isLoading, error } = useAllReservations(STUDIO_ID, 'all', 'all');

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayReservations = useMemo(
    () => allReservations.filter((r) => r.date === todayKey),
    [allReservations, todayKey]
  );
  const pendingReservations = useMemo(
    () => allReservations.filter((r) => r.status === 'pending'),
    [allReservations]
  );
  const monthlyReservations = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return allReservations.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [allReservations]);

  const pendingDateSet = useMemo(
    () => new Set(pendingReservations.map((r) => r.date)),
    [pendingReservations]
  );

  const handleCardClick = (id: string) => navigate(`/admin/reservations/${id}`);

  const handleApprovalClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    approvalDialog.onOpen();
  };

  const handleApprovalSuccess = () => {
    approvalDialog.onClose();
    setSelectedReservation(null);
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl">
        <Box textAlign="center" py={20}>
          <Spinner size="xl" />
          <Text mt={4} color="gray.500">
            読み込み中...
          </Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl">
        <Alert status="error" mt={4}>
          <AlertIcon />
          {error instanceof Error ? error.message : '予約の取得に失敗しました'}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      {isMobile ? (
        <MobileAdminDashboard
          allReservations={allReservations}
          todayCount={todayReservations.length}
          pendingCount={pendingReservations.length}
          monthlyReservations={monthlyReservations}
          pendingDateSet={pendingDateSet}
          onCardClick={handleCardClick}
          onApprovalClick={handleApprovalClick}
        />
      ) : (
        <Container maxW="container.xl">
          <VStack align="stretch" spacing={6}>
            {/* ページタイトル行 */}
            <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
              <Box>
                <Heading size="lg" color="gray.800">
                  予約管理
                </Heading>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  顧客からの予約申請を承認・管理します
                </Text>
              </Box>
              <Button leftIcon={<Plus size={16} />} colorScheme="brand" onClick={createModal.onOpen}>
                予約を追加
              </Button>
            </Flex>

            {/* KPIカード */}
            <KpiCardGrid
              todayCount={todayReservations.length}
              pendingCount={pendingReservations.length}
              monthlyReservations={monthlyReservations}
            />

            {/* 2カラムグリッド */}
            <SimpleGrid columns={{ base: 1, lg: 12 }} spacing={6}>
              {/* 左カラム */}
              <Box gridColumn={{ base: 'auto', lg: 'span 4' }}>
                <VStack align="stretch" spacing={4}>
                  <MiniCalendar pendingDateSet={pendingDateSet} />
                  <UrgentAlertCard pendingCount={pendingReservations.length} />
                </VStack>
              </Box>

              {/* 右カラム */}
              <Box gridColumn={{ base: 'auto', lg: 'span 8' }}>
                <ReservationListSection
                  reservations={allReservations}
                  onCardClick={handleCardClick}
                  onApprovalClick={handleApprovalClick}
                />
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      )}

      {/* 承認/拒否ダイアログ (モバイル/デスクトップ共通) */}
      {selectedReservation && (
        <ReservationApprovalDialog
          isOpen={approvalDialog.isOpen}
          onClose={approvalDialog.onClose}
          reservation={selectedReservation}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {/* 予約作成モーダル (モバイル/デスクトップ共通) */}
      <CreateReservationModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        studioId={STUDIO_ID}
        reservations={allReservations.map((r) => ({
          date: r.date,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
        }))}
      />
    </>
  );
}

