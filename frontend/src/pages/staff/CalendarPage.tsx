import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import ReservationCalendar from '../../components/calendar/ReservationCalendar';
import DayDetailModal from '../../components/calendar/DayDetailModal';
import { useCalendar } from '../../hooks/useCalendar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

export default function StaffCalendarPage() {
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
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 日付クリック → 詳細モーダルを表示
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDayDetailOpen();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            予約カレンダー
          </Heading>
          <Text color="gray.600">
            スタジオの予約状況を一覧で確認できます
          </Text>
        </Box>

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

        {/* 日付詳細モーダル（スタッフは閲覧のみ） */}
        {calendarData && (
          <DayDetailModal
            isOpen={isDayDetailOpen}
            onClose={onDayDetailClose}
            date={selectedDate}
            reservations={calendarData.reservations.filter((r) => r.date === selectedDate)}
            onCreateReservation={() => {}} // スタッフは予約作成不可
          />
        )}
      </VStack>
    </Container>
  );
}
