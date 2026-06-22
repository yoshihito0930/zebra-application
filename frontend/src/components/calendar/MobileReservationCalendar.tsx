import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarReservation } from '../../types';

interface MobileReservationCalendarProps {
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
  selectedDate?: string | null;
  onDateSelect?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  /** 年月の上の「予約カレンダー」ラベルを表示するか（埋め込みウィジェットでは false） */
  showHeaderLabel?: boolean;
}

const getStatusDotColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'green.500';
    case 'tentative':
      return 'orange.500';
    case 'waitlisted':
      return 'purple.500';
    case 'scheduled':
      return 'blue.500';
    case 'pending':
      return 'brand.300';
    default:
      return 'gray.400';
  }
};

interface CalendarCell {
  date: number;
  dateString: string;
  inCurrentMonth: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

const getTodayString = () => {
  const t = new Date();
  return toDateString(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

export default function MobileReservationCalendar({
  reservations,
  blockedSlots = [],
  currentYear,
  currentMonth,
  selectedDate = null,
  onDateSelect,
  onMonthChange,
  showHeaderLabel = true,
}: MobileReservationCalendarProps) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const todayString = getTodayString();

  const generateCells = (): CalendarCell[] => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    const cells: CalendarCell[] = [];

    // 前月の末尾
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      cells.push({
        date: day,
        dateString: toDateString(prevYear, prevMonth, day),
        inCurrentMonth: false,
      });
    }

    // 当月
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        date: day,
        dateString: toDateString(currentYear, currentMonth, day),
        inCurrentMonth: true,
      });
    }

    // 次月の頭で 6 週分（42 セル）に揃える
    while (cells.length < 42) {
      const dayOffset = cells.length - firstDay - daysInMonth + 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      cells.push({
        date: dayOffset,
        dateString: toDateString(nextYear, nextMonth, dayOffset),
        inCurrentMonth: false,
      });
    }

    return cells;
  };

  const getReservationsForDate = (dateString: string) =>
    reservations
      .filter((r) => r.date === dateString)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const getAllDayBlock = (dateString: string) =>
    blockedSlots.find((b) => b.date === dateString && b.is_all_day);

  const hasTimedBlock = (dateString: string) =>
    blockedSlots.some((b) => b.date === dateString && !b.is_all_day);

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      onMonthChange?.(currentYear - 1, 12);
    } else {
      onMonthChange?.(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange?.(currentYear + 1, 1);
    } else {
      onMonthChange?.(currentYear, currentMonth + 1);
    }
  };

  const cells = generateCells();

  return (
    <VStack spacing={3} align="stretch">
      {/* サブヘッダーカード */}
      <Flex
        bg="white"
        borderRadius="lg"
        shadow="sm"
        px={4}
        py={3}
        align="center"
        justify="space-between"
      >
        <Box>
          {showHeaderLabel && (
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              予約カレンダー
            </Text>
          )}
          <Heading size="md" fontWeight="bold" mt={0.5}>
            {currentYear}年 {currentMonth}月
          </Heading>
        </Box>
        <HStack spacing={1}>
          <IconButton
            aria-label="前月"
            icon={<ChevronLeft size={18} />}
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
          />
          <IconButton
            aria-label="翌月"
            icon={<ChevronRight size={18} />}
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
          />
        </HStack>
      </Flex>

      {/* 曜日ヘッダー */}
      <Grid templateColumns="repeat(7, 1fr)" px={1}>
        {weekdays.map((day, index) => (
          <GridItem
            key={day}
            textAlign="center"
            fontSize="sm"
            fontWeight="semibold"
            color={index === 0 ? 'red.500' : index === 6 ? 'blue.500' : 'gray.800'}
            py={2}
          >
            {day}
          </GridItem>
        ))}
      </Grid>

      {/* 日付グリッド */}
      <Grid templateColumns="repeat(7, 1fr)" rowGap={1}>
        {cells.map((cell, index) => {
          const dateReservations = getReservationsForDate(cell.dateString);
          const allDayBlock = getAllDayBlock(cell.dateString);
          const timedBlock = hasTimedBlock(cell.dateString);
          const isCurrentDay = cell.dateString === todayString;
          const isSelected = selectedDate === cell.dateString;
          const dayOfWeek = index % 7;
          const hasReservations = dateReservations.length > 0;
          const isClickable = cell.inCurrentMonth && !allDayBlock;

          // 数字色
          let numberColor: string;
          if (!cell.inCurrentMonth) {
            numberColor = 'gray.300';
          } else if (isCurrentDay) {
            numberColor = 'white';
          } else if (dayOfWeek === 0) {
            numberColor = 'red.500';
          } else if (dayOfWeek === 6) {
            numberColor = 'blue.500';
          } else {
            numberColor = 'gray.900';
          }

          // 円の装飾
          const showFilledCircle = isCurrentDay;
          const showOutlinedCircle =
            !isCurrentDay && cell.inCurrentMonth && (hasReservations || isSelected);

          // ドット
          const visibleDots = dateReservations.slice(0, 3);
          const hasMoreDots = dateReservations.length > 3;

          return (
            <GridItem
              key={`${cell.dateString}-${index}`}
              onClick={() => isClickable && onDateSelect?.(cell.dateString)}
              cursor={isClickable ? 'pointer' : 'default'}
              py={1.5}
            >
              <VStack spacing={1} align="center">
                <Box
                  w="36px"
                  h="36px"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg={showFilledCircle ? 'brand.500' : 'transparent'}
                  borderWidth={showOutlinedCircle ? '1.5px' : 0}
                  borderColor="brand.500"
                  transition="background-color 0.15s ease"
                >
                  <Text fontSize="md" fontWeight={isCurrentDay ? 'bold' : 'medium'} color={numberColor}>
                    {cell.date}
                  </Text>
                </Box>
                <HStack spacing="3px" h="6px" align="center" justify="center">
                  {(allDayBlock || timedBlock) && (
                    <Box
                      w="5px"
                      h="5px"
                      borderRadius="full"
                      bg="gray.500"
                    />
                  )}
                  {visibleDots.map((reservation) => (
                    <Box
                      key={reservation.reservation_id}
                      w="5px"
                      h="5px"
                      borderRadius="full"
                      bg={getStatusDotColor(reservation.status)}
                    />
                  ))}
                  {hasMoreDots && (
                    <Text fontSize="9px" color="gray.500" lineHeight="1">
                      +
                    </Text>
                  )}
                </HStack>
              </VStack>
            </GridItem>
          );
        })}
      </Grid>
    </VStack>
  );
}
