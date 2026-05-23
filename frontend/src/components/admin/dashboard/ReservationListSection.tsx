import { useMemo, useState } from 'react';
import { Alert, AlertIcon, Box, Flex, HStack, Select, Text, VStack } from '@chakra-ui/react';
import ReservationStatusTabs from './ReservationStatusTabs';
import ReservationCard from './ReservationCard';
import {
  countByTab,
  filterByTab,
  groupReservationsByDate,
  isNewReservation,
  type TabKey,
} from '../../../utils/reservationGrouping';
import type { Reservation } from '../../../types';

interface ReservationListSectionProps {
  reservations: Reservation[];
  onCardClick: (id: string) => void;
  onApprovalClick: (reservation: Reservation) => void;
}

type SortOrder = 'asc' | 'desc';

export default function ReservationListSection({
  reservations,
  onCardClick,
  onApprovalClick,
}: ReservationListSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const counts = useMemo(() => countByTab(reservations), [reservations]);
  const filtered = useMemo(() => filterByTab(reservations, activeTab), [reservations, activeTab]);
  const groups = useMemo(() => groupReservationsByDate(filtered, sortOrder), [filtered, sortOrder]);

  return (
    <VStack align="stretch" spacing={4}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
        <ReservationStatusTabs value={activeTab} onChange={setActiveTab} counts={counts} />
        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.600">
            並び順:
          </Text>
          <Select
            size="sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            maxW="140px"
          >
            <option value="asc">日付順</option>
            <option value="desc">日付逆順</option>
          </Select>
        </HStack>
      </Flex>

      {groups.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          表示できる予約がありません
        </Alert>
      ) : (
        <VStack align="stretch" spacing={5}>
          {groups.map((group) => {
            const today = group.label.includes('今日');
            return (
              <Box key={group.date}>
                <HStack spacing={2} mb={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color={today ? 'green.600' : 'gray.700'}
                  >
                    {group.label}
                  </Text>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {group.reservations.map((r) => (
                    <ReservationCard
                      key={r.reservation_id}
                      reservation={r}
                      isNew={isNewReservation(r, reservations)}
                      onCardClick={onCardClick}
                      onApprovalClick={onApprovalClick}
                    />
                  ))}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
