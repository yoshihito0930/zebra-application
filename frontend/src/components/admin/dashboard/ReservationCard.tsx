import { Avatar, Badge, Box, Button, Flex, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { ChevronRight, Clock } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { StatusBadge } from '../../common/StatusBadge';
import { calculateReservationTotal } from '../../../utils/reservationPrice';
import type { Reservation } from '../../../types';

interface ReservationCardProps {
  reservation: Reservation;
  isNew?: boolean;
  onCardClick: (id: string) => void;
  onApprovalClick: (reservation: Reservation) => void;
}

const TYPE_LABEL: Record<Reservation['reservation_type'], string> = {
  regular: 'スチール撮影',
  tentative: '仮予約',
  location_scout: 'ロケハン',
  second_keep: '第2キープ',
};

function getDisplayName(r: Reservation): string {
  if (r.is_guest) return r.guest_name || 'ゲスト';
  return r.user_name || r.user_id;
}

function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0) || '?';
}

function getSubInfo(r: Reservation): string {
  const parts: string[] = [];
  if (r.is_guest) {
    if (r.guest_company) parts.push(r.guest_company);
    if (r.guest_phone) parts.push(r.guest_phone);
  } else {
    if (r.user_company) parts.push(r.user_company);
    if (r.user_phone) parts.push(r.user_phone);
  }
  if (r.number_of_people > 0) parts.push(`${r.number_of_people}名`);
  return parts.join('・');
}

function getExpiryWarning(r: Reservation): string | null {
  if (!r.expiry_date) return null;
  if (r.status !== 'tentative' && r.status !== 'pending') return null;
  const days = differenceInCalendarDays(parseISO(r.expiry_date), new Date());
  if (days < 0) return '期限切れ';
  if (days <= 3) return `残り${days}日で期限切れ`;
  return null;
}

export default function ReservationCard({ reservation, isNew, onCardClick, onApprovalClick }: ReservationCardProps) {
  const isPending = reservation.status === 'pending';
  const isTentativeLike = reservation.status === 'tentative';
  const total = Math.floor(calculateReservationTotal(reservation).total);
  const displayName = getDisplayName(reservation);
  const subInfo = getSubInfo(reservation);
  const expiry = getExpiryWarning(reservation);

  let borderColor = 'gray.200';
  let borderWidth = '1px';
  let bg = 'white';
  if (isPending) {
    borderColor = 'orange.300';
    borderWidth = '2px';
    bg = 'orange.50';
  } else if (isTentativeLike) {
    borderColor = 'orange.200';
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-stop-card-click]')) return;
    onCardClick(reservation.reservation_id);
  };

  return (
    <Box
      data-testid={`reservation-card-${reservation.reservation_id}`}
      bg={bg}
      borderWidth={borderWidth}
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ shadow: 'sm', borderColor: isPending ? 'orange.400' : 'gray.300' }}
      onClick={handleCardClick}
    >
      <Flex align="center" gap={4} wrap={{ base: 'wrap', md: 'nowrap' }}>
        {/* 左: 時間 / 種別 */}
        <VStack align="flex-start" spacing={1} minW="120px">
          <Text fontWeight="bold" fontSize="md" color="gray.800">
            {reservation.start_time} – {reservation.end_time}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {TYPE_LABEL[reservation.reservation_type]}
          </Text>
        </VStack>

        {/* 中央: アバター + 名前 + サブ情報 */}
        <HStack spacing={3} flex={1} minW={0}>
          <Avatar
            size="sm"
            name={displayName}
            getInitials={() => getInitial(displayName)}
            bg={reservation.is_guest ? 'orange.200' : 'gray.200'}
            color="gray.700"
          />
          <VStack align="flex-start" spacing={0.5} flex={1} minW={0}>
            <HStack spacing={2}>
              <Text fontWeight="semibold" fontSize="sm" color="gray.800" noOfLines={1}>
                {displayName}
              </Text>
              {isNew && (
                <Badge colorScheme="purple" fontSize="9px">
                  NEW
                </Badge>
              )}
              {reservation.is_guest && (
                <Badge colorScheme="orange" fontSize="9px">
                  ゲスト
                </Badge>
              )}
            </HStack>
            {subInfo && (
              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                {subInfo}
              </Text>
            )}
            {expiry && (
              <HStack spacing={1} color="orange.500">
                <Clock size={12} />
                <Text fontSize="xs" fontWeight="medium">
                  {expiry}
                </Text>
              </HStack>
            )}
          </VStack>
        </HStack>

        {/* 右: ステータス / 料金 / アクション */}
        <VStack align="flex-end" spacing={2} minW="140px">
          <StatusBadge status={reservation.status} size="sm" />
          <Text fontWeight="bold" fontSize="md" color="gray.800">
            ¥{total.toLocaleString()}
          </Text>
          {isPending ? (
            <HStack spacing={1} data-stop-card-click>
              <Button
                size="xs"
                colorScheme="green"
                data-testid="approve-button"
                onClick={() => onApprovalClick(reservation)}
              >
                承認
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                onClick={() => onApprovalClick(reservation)}
              >
                拒否
              </Button>
            </HStack>
          ) : (
            <IconButton
              aria-label="詳細"
              icon={<ChevronRight size={16} />}
              size="xs"
              variant="ghost"
              data-stop-card-click
              onClick={() => onCardClick(reservation.reservation_id)}
            />
          )}
        </VStack>
      </Flex>
    </Box>
  );
}
