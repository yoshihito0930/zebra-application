import { useState } from 'react';
import { Box, Flex, Grid, HStack, IconButton, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface MiniCalendarProps {
  pendingDateSet: Set<string>;
  onDateClick?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function MiniCalendar({ pendingDateSet, onDateClick, onMonthChange }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  const firstDay = startOfMonth(currentMonth);
  const lastDay = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
  const leadingBlanks = getDay(firstDay);

  const changeMonth = (next: Date) => {
    setCurrentMonth(next);
    onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
  };

  const goPrev = () => changeMonth(subMonths(currentMonth, 1));
  const goNext = () => changeMonth(addMonths(currentMonth, 1));

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4}>
      {/* ヘッダー */}
      <Flex align="center" justify="space-between" mb={3}>
        <IconButton aria-label="前月" icon={<ChevronLeft size={16} />} size="xs" variant="ghost" onClick={goPrev} />
        <Text fontWeight="bold" fontSize="sm">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </Text>
        <IconButton aria-label="翌月" icon={<ChevronRight size={16} />} size="xs" variant="ghost" onClick={goNext} />
      </Flex>

      {/* 曜日ヘッダー */}
      <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
        {WEEKDAYS.map((wd, i) => (
          <Box
            key={wd}
            textAlign="center"
            fontSize="xs"
            fontWeight="semibold"
            color={i === 0 ? 'red.500' : i === 6 ? 'blue.500' : 'gray.600'}
          >
            {wd}
          </Box>
        ))}
      </Grid>

      {/* 日付グリッド */}
      <Grid templateColumns="repeat(7, 1fr)" gap={1}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <Box key={`blank-${i}`} h="32px" />
        ))}
        {daysInMonth.map((d) => {
          const dayOfWeek = getDay(d);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);
          const dateKey = format(d, 'yyyy-MM-dd');
          const hasPending = pendingDateSet.has(dateKey);

          let color = 'gray.700';
          if (dayOfWeek === 0) color = 'red.500';
          else if (dayOfWeek === 6) color = 'blue.500';
          if (!isCurrentMonth) color = 'gray.300';

          return (
            <Box
              key={dateKey}
              position="relative"
              h="32px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor={onDateClick ? 'pointer' : 'default'}
              borderRadius="full"
              bg={today ? 'brand.300' : 'transparent'}
              color={today ? 'white' : color}
              fontWeight={today ? 'bold' : 'medium'}
              fontSize="sm"
              _hover={onDateClick ? { bg: today ? 'brand.400' : 'gray.100' } : undefined}
              onClick={() => onDateClick?.(dateKey)}
            >
              {format(d, 'd')}
              {hasPending && (
                <Box
                  position="absolute"
                  bottom="2px"
                  right="50%"
                  transform="translateX(50%) translateY(6px)"
                  w="4px"
                  h="4px"
                  bg="orange.400"
                  borderRadius="full"
                />
              )}
            </Box>
          );
        })}
      </Grid>

      {/* 凡例 */}
      <HStack spacing={2} mt={3} fontSize="xs" color="gray.500">
        <Box w="6px" h="6px" bg="orange.400" borderRadius="full" />
        <Text>承認待ちの予約あり</Text>
      </HStack>
    </Box>
  );
}
