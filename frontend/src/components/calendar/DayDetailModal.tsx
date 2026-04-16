import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  Badge,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { Clock } from 'lucide-react';
import type { CalendarReservation } from '../../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  reservations: CalendarReservation[];
  onCreateReservation: (date: string, startTime?: string) => void;
}

export default function DayDetailModal({
  isOpen,
  onClose,
  date,
  reservations,
  onCreateReservation,
}: DayDetailModalProps) {
  const bgColor = useColorModeValue('white', 'gray.800');

  // 日付をフォーマット（例: 2026年4月21日（月））
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  // 予約のステータスに応じた色を取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'green.100', border: 'green.500', text: 'green.800', label: '本予約' };
      case 'tentative':
        return { bg: 'orange.100', border: 'orange.500', text: 'orange.800', label: '仮予約' };
      case 'pending':
        return { bg: 'yellow.100', border: 'yellow.500', text: 'yellow.800', label: '承認待ち' };
      case 'scheduled':
        return { bg: 'blue.100', border: 'blue.500', text: 'blue.800', label: 'ロケハン' };
      case 'waitlisted':
        return { bg: 'purple.100', border: 'purple.500', text: 'purple.800', label: '第2キープ' };
      default:
        return { bg: 'gray.100', border: 'gray.500', text: 'gray.800', label: '不明' };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <HStack>
            <Clock size={20} />
            <Text>{formatDate(date)}の予約</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={3}>
            {reservations.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">この日はまだ予約がありません</Text>
              </Box>
            ) : (
              reservations.map((reservation) => {
                const statusColor = getStatusColor(reservation.status);
                return (
                  <Box
                    key={reservation.reservation_id}
                    borderWidth="1px"
                    borderColor={statusColor.border}
                    borderLeftWidth="4px"
                    borderRadius="md"
                    p={4}
                    bg={statusColor.bg}
                    _dark={{ bg: statusColor.bg.replace('100', '800') }}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="lg" fontWeight="bold" color={statusColor.text}>
                        {reservation.start_time} - {reservation.end_time}
                      </Text>
                      <Badge colorScheme={statusColor.border.split('.')[0]} fontSize="sm">
                        {statusColor.label}
                      </Badge>
                    </HStack>
                    {reservation.reservation_type === 'second_keep' && (
                      <Text fontSize="sm" color={statusColor.text}>
                        ※ 第1候補キャンセル時に繰り上げ
                      </Text>
                    )}
                  </Box>
                );
              })
            )}

            <Divider my={2} />

            <Button
              colorScheme="brand"
              width="full"
              size="lg"
              onClick={() => {
                onCreateReservation(date);
                onClose();
              }}
            >
              この日の予約を作成する
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
