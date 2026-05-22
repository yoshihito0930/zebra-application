import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import type { CalendarReservation } from '../../types';

interface CalendarSidePanelProps {
  selectedDate: string | null;
  reservations: CalendarReservation[];
  onCreateReservation: (date: string) => void;
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
      return { bg: 'green.50', border: 'green.500', text: 'green.800', label: '本予約' };
    case 'tentative':
      return { bg: 'orange.50', border: 'orange.500', text: 'orange.800', label: '仮予約' };
    case 'pending':
      return { bg: 'brand.50', border: 'brand.300', text: 'brand.700', label: '承認待ち' };
    case 'scheduled':
      return { bg: 'blue.50', border: 'blue.500', text: 'blue.800', label: 'ロケハン' };
    case 'waitlisted':
      return { bg: 'purple.50', border: 'purple.500', text: 'purple.800', label: '第2キープ' };
    default:
      return { bg: 'gray.50', border: 'gray.400', text: 'gray.700', label: '不明' };
  }
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const formatLongDate = (dateStr: string): { headline: string; weekdayIndex: number } => {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdayIndex = d.getDay();
  const weekday = WEEKDAYS[weekdayIndex];
  return { headline: `${month}月${day}日（${weekday}）`, weekdayIndex };
};

const weekdayColor = (idx: number): string => {
  if (idx === 0) return 'red.500';
  if (idx === 6) return 'blue.500';
  return 'gray.700';
};

export default function CalendarSidePanel({
  selectedDate,
  reservations,
  onCreateReservation,
}: CalendarSidePanelProps) {
  if (!selectedDate) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
        position="sticky"
        top="80px"
      >
        <Text fontSize="sm" color="gray.500">
          カレンダーで日付を選択すると、その日の予約状況がここに表示されます。
        </Text>
      </Box>
    );
  }

  const { headline, weekdayIndex } = formatLongDate(selectedDate);
  const sorted = [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
      borderColor="gray.200"
      position="sticky"
      top="80px"
    >
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>
            選択中の日付
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color={weekdayColor(weekdayIndex)}>
            {headline}
          </Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {sorted.length > 0 ? `${sorted.length}件の予約` : '予約はありません'}
          </Text>
        </Box>

        {sorted.length > 0 && (
          <VStack align="stretch" spacing={3}>
            {sorted.map((reservation) => {
              const v = getStatusVisuals(reservation.status);
              return (
                <Box
                  key={reservation.reservation_id}
                  bg={v.bg}
                  borderLeftWidth="4px"
                  borderLeftColor={v.border}
                  borderRadius="sm"
                  px={3}
                  py={2}
                  cursor="default"
                >
                  <HStack justify="space-between" align="baseline">
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      {reservation.start_time} – {reservation.end_time}
                    </Text>
                  </HStack>
                  <Text fontSize="md" fontWeight="bold" color={v.text} mt={0.5}>
                    {v.label}
                  </Text>
                  {reservation.reservation_type === 'second_keep' && (
                    <Text fontSize="xs" color={v.text} mt={1}>
                      ※第1候補キャンセル時に繰り上げ
                    </Text>
                  )}
                </Box>
              );
            })}
          </VStack>
        )}

        <Button
          variant="outline"
          colorScheme="brand"
          width="full"
          borderStyle="dashed"
          leftIcon={<Plus size={16} />}
          onClick={() => onCreateReservation(selectedDate)}
        >
          この日に予約を追加
        </Button>
      </VStack>
    </Box>
  );
}
