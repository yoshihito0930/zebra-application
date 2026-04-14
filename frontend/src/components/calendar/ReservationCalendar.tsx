import { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  GridItem,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarReservation } from '../../types';
import StatusBadge from '../common/StatusBadge';

interface ReservationCalendarProps {
  studioId: string;
  reservations: CalendarReservation[];
  blockedSlots?: Array<{ date: string; start_time?: string; end_time?: string }>;
  onDateClick?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

export default function ReservationCalendar({
  studioId,
  reservations,
  blockedSlots = [],
  onDateClick,
  onMonthChange,
}: ReservationCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const bgHover = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const todayBg = useColorModeValue('brand.50', 'brand.900');
  const disabledBg = useColorModeValue('gray.100', 'gray.800');

  // 曜日ラベル
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  // 月の日数を取得
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 月の初日の曜日を取得（0: 日曜日）
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // カレンダーのマス目を生成
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{ date: number | null; dateString: string }> = [];

    // 前月の空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, dateString: '' });
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date: day, dateString });
    }

    return days;
  };

  // 指定日の予約を取得
  const getReservationsForDate = (dateString: string) => {
    return reservations.filter((r) => r.date === dateString);
  };

  // 指定日がブロック枠かチェック
  const isDateBlocked = (dateString: string) => {
    return blockedSlots.some((b) => b.date === dateString);
  };

  // 今日かどうかチェック
  const isToday = (dateString: string) => {
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString === todayString;
  };

  // 過去の日付かチェック
  const isPast = (dateString: string) => {
    const date = new Date(dateString);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayMidnight;
  };

  // 月を変更
  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
      onMonthChange?.(currentYear - 1, 12);
    } else {
      setCurrentMonth(currentMonth - 1);
      onMonthChange?.(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
      onMonthChange?.(currentYear + 1, 1);
    } else {
      setCurrentMonth(currentMonth + 1);
      onMonthChange?.(currentYear, currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    onMonthChange?.(now.getFullYear(), now.getMonth() + 1);
  };

  const calendarDays = generateCalendarDays();

  return (
    <VStack spacing={4} align="stretch">
      {/* ヘッダー */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ChevronLeft size={16} />}
            onClick={handlePreviousMonth}
          >
            前月
          </Button>
          <Button
            size="sm"
            variant="outline"
            rightIcon={<ChevronRight size={16} />}
            onClick={handleNextMonth}
          >
            翌月
          </Button>
          <Button size="sm" variant="ghost" onClick={handleToday}>
            今日
          </Button>
        </HStack>
        <Text fontSize="xl" fontWeight="bold">
          {currentYear}年 {currentMonth}月
        </Text>
      </HStack>

      {/* カレンダー */}
      <Box borderWidth="1px" borderRadius="md" borderColor={borderColor} overflow="hidden">
        {/* 曜日ヘッダー */}
        <Grid templateColumns="repeat(7, 1fr)" bg="gray.100" _dark={{ bg: 'gray.700' }}>
          {weekdays.map((day, index) => (
            <GridItem
              key={day}
              p={2}
              textAlign="center"
              fontWeight="semibold"
              fontSize="sm"
              color={index === 0 ? 'red.500' : index === 6 ? 'blue.500' : 'gray.700'}
              _dark={{
                color: index === 0 ? 'red.300' : index === 6 ? 'blue.300' : 'gray.300',
              }}
            >
              {day}
            </GridItem>
          ))}
        </Grid>

        {/* 日付グリッド */}
        <Grid templateColumns="repeat(7, 1fr)">
          {calendarDays.map((day, index) => {
            if (!day.date) {
              // 空白のセル
              return (
                <GridItem
                  key={`empty-${index}`}
                  minH="100px"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={disabledBg}
                />
              );
            }

            const dateReservations = getReservationsForDate(day.dateString);
            const blocked = isDateBlocked(day.dateString);
            const isCurrentDay = isToday(day.dateString);
            const isPastDate = isPast(day.dateString);
            const isClickable = !isPastDate && !blocked && onDateClick;

            return (
              <GridItem
                key={day.dateString}
                minH="100px"
                borderWidth="1px"
                borderColor={borderColor}
                bg={isCurrentDay ? todayBg : 'white'}
                _dark={{
                  bg: isCurrentDay ? todayBg : 'gray.800',
                }}
                _hover={
                  isClickable
                    ? {
                        bg: bgHover,
                        cursor: 'pointer',
                      }
                    : {}
                }
                onClick={() => {
                  if (isClickable) {
                    onDateClick(day.dateString);
                  }
                }}
                position="relative"
              >
                <VStack align="stretch" spacing={1} p={2} h="full">
                  {/* 日付 */}
                  <HStack justify="space-between" align="flex-start">
                    <Text
                      fontSize="sm"
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      color={isPastDate ? 'gray.400' : 'gray.700'}
                      _dark={{
                        color: isPastDate ? 'gray.600' : 'gray.300',
                      }}
                    >
                      {day.date}
                    </Text>
                    {isCurrentDay && (
                      <Box
                        bg="brand.500"
                        color="white"
                        fontSize="xs"
                        px={1}
                        borderRadius="sm"
                      >
                        今日
                      </Box>
                    )}
                  </HStack>

                  {/* ブロック枠表示 */}
                  {blocked && (
                    <Box
                      bg="gray.300"
                      _dark={{ bg: 'gray.600' }}
                      borderRadius="sm"
                      px={2}
                      py={1}
                    >
                      <Text fontSize="xs" fontWeight="medium">
                        休業日
                      </Text>
                    </Box>
                  )}

                  {/* 予約表示 */}
                  {dateReservations.length > 0 && (
                    <VStack align="stretch" spacing={1} flex={1} overflowY="auto">
                      {dateReservations.slice(0, 3).map((reservation) => (
                        <Tooltip
                          key={reservation.reservation_id}
                          label={`${reservation.start_time} - ${reservation.end_time}`}
                          placement="top"
                          hasArrow
                        >
                          <Box>
                            <StatusBadge
                              status={reservation.status}
                              size="xs"
                              showIcon={false}
                            />
                          </Box>
                        </Tooltip>
                      ))}
                      {dateReservations.length > 3 && (
                        <Text fontSize="xs" color="gray.500">
                          +{dateReservations.length - 3}件
                        </Text>
                      )}
                    </VStack>
                  )}
                </VStack>
              </GridItem>
            );
          })}
        </Grid>
      </Box>

      {/* 凡例 */}
      <HStack spacing={6} fontSize="sm" flexWrap="wrap">
        <HStack spacing={2}>
          <StatusBadge status="confirmed" size="xs" showIcon={false} />
          <Text>確定予約</Text>
        </HStack>
        <HStack spacing={2}>
          <StatusBadge status="tentative" size="xs" showIcon={false} />
          <Text>仮予約</Text>
        </HStack>
        <HStack spacing={2}>
          <StatusBadge status="pending" size="xs" showIcon={false} />
          <Text>承認待ち</Text>
        </HStack>
        <HStack spacing={2}>
          <StatusBadge status="scheduled" size="xs" showIcon={false} />
          <Text>ロケハン</Text>
        </HStack>
        <HStack spacing={2}>
          <Box bg="gray.300" _dark={{ bg: 'gray.600' }} px={2} py={1} borderRadius="sm">
            <Text fontSize="xs">休業日</Text>
          </Box>
        </HStack>
      </HStack>
    </VStack>
  );
}
