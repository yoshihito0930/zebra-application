import {
  Box,
  Button,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarReservation } from '../../types';
import StatusLegendPopover from './StatusLegendPopover';

interface ReservationCalendarProps {
  studioId: string;
  reservations: CalendarReservation[];
  blockedSlots?: Array<{
    date: string;
    is_all_day: boolean;
    start_time?: string;
    end_time?: string;
    reason: string;
  }>;
  currentYear: number;
  currentMonth: number;
  onDateClick?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  selectedDate?: string | null;
  onDateSelect?: (date: string) => void;
}

interface StatusVisuals {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const getStatusVisuals = (status: string): StatusVisuals => {
  switch (status) {
    case 'confirmed':
      return { bg: 'green.100', border: 'green.500', text: 'green.800', label: '本予約' };
    case 'tentative':
      return { bg: 'orange.100', border: 'orange.500', text: 'orange.800', label: '仮予約' };
    case 'pending':
      return { bg: 'brand.50', border: 'brand.300', text: 'brand.700', label: '承認待ち' };
    case 'scheduled':
      return { bg: 'blue.100', border: 'blue.500', text: 'blue.800', label: 'ロケハン' };
    case 'waitlisted':
      return { bg: 'purple.100', border: 'purple.500', text: 'purple.800', label: '第2キープ' };
    default:
      return { bg: 'gray.100', border: 'gray.500', text: 'gray.800', label: '不明' };
  }
};

export default function ReservationCalendar({
  reservations,
  blockedSlots = [],
  currentYear,
  currentMonth,
  onDateClick,
  onMonthChange,
  selectedDate = null,
  onDateSelect,
}: ReservationCalendarProps) {
  const today = new Date();

  const bgHover = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const disabledBg = useColorModeValue('gray.50', 'gray.800');

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{ date: number | null; dateString: string }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, dateString: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date: day, dateString });
    }

    return days;
  };

  const getReservationsForDate = (dateString: string) => {
    return reservations
      .filter((r) => r.date === dateString)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getAllDayBlock = (dateString: string) =>
    blockedSlots.find((b) => b.date === dateString && b.is_all_day);

  const getTimedBlocks = (dateString: string) =>
    blockedSlots
      .filter((b) => b.date === dateString && !b.is_all_day)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));

  const isToday = (dateString: string) => {
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString === todayString;
  };

  const isPast = (dateString: string) => {
    const date = new Date(dateString);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayMidnight;
  };

  const handlePreviousMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth;

    if (currentMonth === 1) {
      newMonth = 12;
      newYear = currentYear - 1;
    } else {
      newMonth = currentMonth - 1;
    }

    onMonthChange?.(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth;

    if (currentMonth === 12) {
      newMonth = 1;
      newYear = currentYear + 1;
    } else {
      newMonth = currentMonth + 1;
    }

    onMonthChange?.(newYear, newMonth);
  };

  const handleToday = () => {
    const now = new Date();
    onMonthChange?.(now.getFullYear(), now.getMonth() + 1);
  };

  const handleCellClick = (dateString: string) => {
    onDateSelect?.(dateString);
    onDateClick?.(dateString);
  };

  const calendarDays = generateCalendarDays();

  return (
    <VStack spacing={4} align="stretch">
      {/* ヘッダー */}
      <HStack justify="space-between" wrap="wrap" spacing={3}>
        <HStack spacing={2}>
          <IconButton
            aria-label="前月"
            icon={<ChevronLeft size={18} />}
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
          />
          <Text fontSize="xl" fontWeight="bold" minW="120px" textAlign="center">
            {currentYear}年 {currentMonth}月
          </Text>
          <IconButton
            aria-label="翌月"
            icon={<ChevronRight size={18} />}
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
          />
          <Button size="sm" variant="outline" onClick={handleToday}>
            今日
          </Button>
        </HStack>
        <HStack spacing={1}>
          <Text fontSize="sm" color="gray.500">
            {currentYear}年{currentMonth}月の予約状況
          </Text>
          <StatusLegendPopover />
        </HStack>
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
              return (
                <GridItem
                  key={`empty-${index}`}
                  minH="110px"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={disabledBg}
                />
              );
            }

            const dateReservations = getReservationsForDate(day.dateString);
            const allDayBlock = getAllDayBlock(day.dateString);
            const timedBlocks = getTimedBlocks(day.dateString);
            const isCurrentDay = isToday(day.dateString);
            const isPastDate = isPast(day.dateString);
            const isClickable = !isPastDate && !allDayBlock;
            const isSelected = selectedDate === day.dateString;
            const dayOfWeek = new Date(day.dateString).getDay();
            const dayNumberColor = isPastDate
              ? 'gray.400'
              : dayOfWeek === 0
              ? 'red.500'
              : dayOfWeek === 6
              ? 'blue.500'
              : 'gray.700';

            return (
              <GridItem
                key={day.dateString}
                minH="110px"
                borderWidth="1px"
                borderColor={borderColor}
                bg="white"
                _dark={{ bg: 'gray.800' }}
                _hover={
                  isClickable
                    ? {
                        bg: bgHover,
                        cursor: 'pointer',
                      }
                    : {}
                }
                onClick={() => {
                  if (isClickable) handleCellClick(day.dateString);
                }}
                position="relative"
                boxShadow={isSelected ? 'inset 0 0 0 2px var(--chakra-colors-brand-400)' : undefined}
              >
                <VStack align="stretch" spacing={1} p={2} h="full">
                  {/* 日付 */}
                  <HStack justify="flex-start" align="center">
                    {isCurrentDay ? (
                      <Box
                        bg="brand.500"
                        color="white"
                        borderRadius="full"
                        w="24px"
                        h="24px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        {day.date}
                      </Box>
                    ) : (
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={dayNumberColor}
                        _dark={{
                          color: isPastDate ? 'gray.600' : 'gray.300',
                        }}
                      >
                        {day.date}
                      </Text>
                    )}
                  </HStack>

                  {/* ブロック枠（終日） */}
                  {allDayBlock && (
                    <Box bg="gray.300" _dark={{ bg: 'gray.600' }} borderRadius="sm" px={2} py={1}>
                      <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                        {allDayBlock.reason || '休業日'}
                      </Text>
                    </Box>
                  )}

                  {/* ブロック枠（時間指定） */}
                  {!allDayBlock &&
                    timedBlocks.slice(0, 2).map((b) => (
                      <Box
                        key={`${b.start_time}-${b.end_time}`}
                        bg="gray.300"
                        _dark={{ bg: 'gray.600' }}
                        borderRadius="sm"
                        px={2}
                        py={1}
                      >
                        <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                          {`${b.reason} ${b.start_time}-${b.end_time}`}
                        </Text>
                      </Box>
                    ))}

                  {/* 予約バッジ（2段表示） */}
                  {!allDayBlock && dateReservations.length > 0 && (
                    <VStack align="stretch" spacing={1} flex={1} overflow="hidden">
                      {dateReservations.slice(0, 2).map((reservation) => {
                        const v = getStatusVisuals(reservation.status);
                        return (
                          <Box
                            key={reservation.reservation_id}
                            bg={v.bg}
                            _dark={{ bg: v.bg.replace('100', '800').replace('50', '900') }}
                            borderLeftWidth="4px"
                            borderLeftColor={v.border}
                            px={2}
                            py={1}
                            borderRadius="sm"
                          >
                            <Text fontSize="xs" fontWeight="semibold" color={v.text} noOfLines={1}>
                              {reservation.start_time}–{reservation.end_time}
                            </Text>
                            <Text fontSize="xs" fontWeight="bold" color={v.text} noOfLines={1}>
                              {v.label}
                            </Text>
                          </Box>
                        );
                      })}
                      {dateReservations.length > 2 && (
                        <Text fontSize="xs" color="gray.500" textAlign="center" fontWeight="medium">
                          +{dateReservations.length - 2}件
                        </Text>
                      )}
                    </VStack>
                  )}

                  {/* 空き表示 */}
                  {!allDayBlock && timedBlocks.length === 0 && !isPastDate && dateReservations.length === 0 && (
                    <Box flex={1} display="flex" alignItems="flex-end" justifyContent="flex-start">
                      <Text fontSize="xs" color="gray.400">
                        空き
                      </Text>
                    </Box>
                  )}
                </VStack>
              </GridItem>
            );
          })}
        </Grid>
      </Box>
    </VStack>
  );
}
