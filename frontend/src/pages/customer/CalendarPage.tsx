import { useState } from 'react';
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
import { LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ReservationCalendar from '../../components/calendar/ReservationCalendar';
import CreateReservationModal from '../../components/reservation/CreateReservationModal';
import DayDetailModal from '../../components/calendar/DayDetailModal';
import { useCalendar } from '../../hooks/useCalendar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // React Queryでカレンダーデータ取得
  const {
    data: calendarData,
    isLoading,
    error,
  } = useCalendar(STUDIO_ID, currentYear, currentMonth);

  // 月変更時
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    // React Queryが自動的に新しいデータを取得
  };

  // 日付詳細モーダル
  const { isOpen: isDayDetailOpen, onOpen: onDayDetailOpen, onClose: onDayDetailClose } = useDisclosure();

  // 予約作成モーダル
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');

  // 日付クリック → 詳細モーダルを表示
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDayDetailOpen();
  };

  // 詳細モーダルから予約作成
  const handleCreateReservationFromDetail = (date: string, startTime?: string) => {
    setSelectedDate(date);
    setSelectedStartTime(startTime || '');
    onModalOpen();
  };

  // 予約作成成功時
  const handleReservationSuccess = () => {
    // React Queryが自動的にカレンダーを再取得（invalidateQueriesで処理）
    toast({
      title: '予約を作成しました',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
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
              <Text fontWeight="semibold">ゲストとしても予約可能です</Text>
              <Text fontSize="sm">
                会員登録なしでも予約を作成できます。日付をクリックして「ゲストとして予約」タブから予約してください。
                会員登録すると、予約履歴の確認や簡単予約が可能になります。
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

        {error && !isLoading && <ErrorMessage message={error instanceof Error ? error.message : 'カレンダーの取得に失敗しました'} />}

        {!isLoading && !error && calendarData && (
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <ReservationCalendar
              studioId={STUDIO_ID}
              reservations={calendarData.reservations}
              blockedSlots={calendarData.blocked_slots}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onDateClick={handleDateClick}
              onMonthChange={handleMonthChange}
            />
          </Box>
        )}

        {/* 日付詳細モーダル */}
        {calendarData && (
          <DayDetailModal
            isOpen={isDayDetailOpen}
            onClose={onDayDetailClose}
            date={selectedDate}
            reservations={calendarData.reservations.filter((r) => r.date === selectedDate)}
            onCreateReservation={handleCreateReservationFromDetail}
          />
        )}

        {/* 予約作成モーダル */}
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          studioId={STUDIO_ID}
          initialDate={selectedDate}
          initialStartTime={selectedStartTime}
          onSuccess={handleReservationSuccess}
          reservations={calendarData?.reservations || []}
        />
      </VStack>
    </Container>
  );
}
