import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Button,
  Alert,
  AlertIcon,
  HStack,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { Plus, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ReservationCalendar from '../../components/calendar/ReservationCalendar';
import CreateReservationModal from '../../components/reservation/CreateReservationModal';
import { mockGetCalendar } from '../../services/reservationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import type { CalendarResponse } from '../../types';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // カレンダーデータ取得
  const fetchCalendarData = async (year: number, month: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mockGetCalendar(STUDIO_ID, year, month);
      setCalendarData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カレンダーの取得に失敗しました';
      setError(errorMessage);
      toast({
        title: 'エラー',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    fetchCalendarData(currentYear, currentMonth);
  }, []);

  // 月変更時
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    fetchCalendarData(year, month);
  };

  // 予約作成モーダル
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 日付クリック
  const handleDateClick = (date: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'ログインが必要です',
        description: '予約を作成するにはログインしてください',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setSelectedDate(date);
    onModalOpen();
  };

  // 予約作成成功時
  const handleReservationSuccess = () => {
    // カレンダーを再読み込み
    fetchCalendarData(currentYear, currentMonth);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            予約カレンダー
          </Heading>
          <Text color="gray.600">
            スタジオの空き状況を確認して予約を作成できます
          </Text>
        </Box>

        {/* ゲストユーザー向け案内 */}
        {!isAuthenticated && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <VStack align="flex-start" spacing={2} flex={1}>
              <Text fontWeight="semibold">予約を作成するにはログインが必要です</Text>
              <Text fontSize="sm">
                カレンダーは閲覧可能です。予約を作成する場合は、ログインまたは新規登録してください。
              </Text>
              <HStack spacing={3} mt={2}>
                <Button
                  size="sm"
                  leftIcon={<LogIn size={16} />}
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => navigate('/login')}
                >
                  ログイン
                </Button>
                <Button
                  size="sm"
                  leftIcon={<UserPlus size={16} />}
                  colorScheme="blue"
                  onClick={() => navigate('/signup')}
                >
                  新規登録
                </Button>
              </HStack>
            </VStack>
          </Alert>
        )}

        {/* カレンダー表示 */}
        {isLoading && <LoadingSpinner />}

        {error && !isLoading && <ErrorMessage message={error} />}

        {!isLoading && !error && calendarData && (
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <ReservationCalendar
              studioId={STUDIO_ID}
              reservations={calendarData.reservations}
              blockedSlots={calendarData.blocked_slots}
              onDateClick={handleDateClick}
              onMonthChange={handleMonthChange}
            />
          </Box>
        )}

        {/* 予約作成モーダル */}
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          studioId={STUDIO_ID}
          initialDate={selectedDate}
          onSuccess={handleReservationSuccess}
        />
      </VStack>
    </Container>
  );
}
