import { Avatar, Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { Check, Clock } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { StatusBadge } from '../../common/StatusBadge';
import { calculateReservationTotal } from '../../../utils/reservationPrice';
import type { Reservation } from '../../../types';

interface MobileReservationCardProps {
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
  return name.trim().charAt(0) || '?';
}

function getSubInfo(r: Reservation): string {
  const parts: string[] = [];
  if (r.is_guest) {
    if (r.guest_company) parts.push(r.guest_company);
  } else {
    if (r.user_company) parts.push(r.user_company);
  }
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

function getStripeColor(r: Reservation): string {
  switch (r.status) {
    case 'pending':
      return 'orange.400';
    case 'confirmed':
      return 'green.500';
    case 'tentative':
      return 'orange.300';
    case 'scheduled':
      return 'blue.400';
    case 'waitlisted':
      return 'purple.400';
    default:
      return 'gray.300';
  }
}

export default function MobileReservationCard({
  reservation,
  isNew,
  onCardClick,
  onApprovalClick,
}: MobileReservationCardProps) {
  const isPending = reservation.status === 'pending';
  const total = Math.floor(calculateReservationTotal(reservation).total);
  const displayName = getDisplayName(reservation);
  const subInfo = getSubInfo(reservation);
  const expiry = getExpiryWarning(reservation);
  const stripeColor = getStripeColor(reservation);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-stop-card-click]')) return;
    onCardClick(reservation.reservation_id);
  };

  return (
    <Box
      data-testid={`mobile-reservation-card-${reservation.reservation_id}`}
      position="relative"
      bg={isPending ? 'orange.50' : 'white'}
      borderWidth="1px"
      borderColor={isPending ? 'orange.300' : 'gray.200'}
      borderRadius="lg"
      pl={4}
      pr={3}
      py={3}
      overflow="hidden"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ shadow: 'sm' }}
      onClick={handleCardClick}
    >
      {/* 左端ストライプ */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="5px"
        bg={stripeColor}
      />

      <VStack align="stretch" spacing={2}>
        {/* 1行目: 時刻 + ステータス */}
        <Flex justify="space-between" align="center">
          <Text fontWeight="bold" fontSize="md" color="gray.900">
            {reservation.start_time} – {reservation.end_time}
          </Text>
          <StatusBadge status={reservation.status} size="sm" />
        </Flex>

        {/* 2行目: 種別 + NEW */}
        <HStack spacing={2}>
          <Text fontWeight="bold" fontSize="sm" color="gray.800">
            {TYPE_LABEL[reservation.reservation_type]}
          </Text>
          {isNew && (
            <Badge colorScheme="pink" fontSize="9px">
              NEW
            </Badge>
          )}
          {reservation.is_guest && (
            <Badge colorScheme="orange" fontSize="9px">
              ゲスト
            </Badge>
          )}
        </HStack>

        {/* 3行目: アバター + 名前 + 会社 */}
        <HStack spacing={2}>
          <Avatar
            size="xs"
            name={displayName}
            getInitials={() => getInitial(displayName)}
            bg={reservation.is_guest ? 'orange.200' : 'gray.200'}
            color="gray.700"
          />
          <Text fontSize="sm" color="gray.700" noOfLines={1}>
            {displayName}
            {subInfo && `・${subInfo}`}
          </Text>
        </HStack>

        {/* 4行目: 人数 + 料金 */}
        <Text fontSize="sm" color="gray.600">
          {reservation.number_of_people}名 ・ ¥{total.toLocaleString()}
        </Text>

        {/* 期限警告 (該当時のみ) */}
        {expiry && (
          <HStack spacing={1} color="orange.500">
            <Clock size={12} />
            <Text fontSize="xs" fontWeight="medium">
              {expiry}
            </Text>
          </HStack>
        )}

        {/* 承認待ちカードのみ: 3ボタン */}
        {isPending && (
          <HStack spacing={2} pt={1} data-stop-card-click>
            <Button
              flex={1}
              size="sm"
              colorScheme="green"
              leftIcon={<Check size={14} />}
              data-testid="mobile-approve-button"
              onClick={() => onApprovalClick(reservation)}
            >
              承認
            </Button>
            <Button
              flex={1}
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={() => onApprovalClick(reservation)}
            >
              拒否
            </Button>
            <Button
              flex={1}
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={() => onCardClick(reservation.reservation_id)}
            >
              詳細
            </Button>
          </HStack>
        )}
      </VStack>
    </Box>
  );
}
