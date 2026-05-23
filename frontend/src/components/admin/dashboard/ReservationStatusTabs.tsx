import { Box, HStack, Text } from '@chakra-ui/react';
import { TAB_KEYS, TAB_LABELS, type TabKey } from '../../../utils/reservationGrouping';

interface ReservationStatusTabsProps {
  value: TabKey;
  onChange: (next: TabKey) => void;
  counts: Record<TabKey, number>;
}

const dotColor: Record<TabKey, string> = {
  all: 'transparent',
  pending: 'orange.400',
  confirmed: 'green.500',
  tentative: 'orange.300',
  other: 'gray.400',
};

export default function ReservationStatusTabs({ value, onChange, counts }: ReservationStatusTabsProps) {
  return (
    <HStack spacing={2} flexWrap="wrap">
      {TAB_KEYS.map((key) => {
        const active = value === key;
        const isAll = key === 'all';
        return (
          <Box
            key={key}
            as="button"
            type="button"
            display="inline-flex"
            alignItems="center"
            gap={2}
            px={4}
            py={1.5}
            borderRadius="full"
            borderWidth="1px"
            borderColor={active ? (isAll ? 'gray.800' : 'gray.300') : 'gray.200'}
            bg={active && isAll ? 'gray.800' : active ? 'white' : 'white'}
            color={active && isAll ? 'white' : 'gray.700'}
            fontSize="sm"
            fontWeight={active ? 'bold' : 'medium'}
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ bg: active ? undefined : 'gray.50' }}
            onClick={() => onChange(key)}
          >
            {!isAll && <Box w="6px" h="6px" borderRadius="full" bg={dotColor[key]} />}
            <Text as="span">{TAB_LABELS[key]}</Text>
            <Text as="span" fontSize="xs" color={active && isAll ? 'whiteAlpha.800' : 'gray.500'}>
              {counts[key]}
            </Text>
          </Box>
        );
      })}
    </HStack>
  );
}
