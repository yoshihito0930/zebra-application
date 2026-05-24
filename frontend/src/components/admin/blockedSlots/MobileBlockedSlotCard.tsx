import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { BlockedSlot } from '../../../types';

interface MobileBlockedSlotCardProps {
  slot: BlockedSlot;
  onDelete: (slot: BlockedSlot) => void;
  isPast: boolean;
}

export default function MobileBlockedSlotCard({
  slot,
  onDelete,
  isPast,
}: MobileBlockedSlotCardProps) {
  return (
    <Box
      position="relative"
      bg={isPast ? 'gray.50' : 'white'}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      pl={4}
      pr={2}
      py={3}
      overflow="hidden"
      opacity={isPast ? 0.7 : 1}
    >
      {/* 左端ストライプ */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="5px"
        bg="gray.400"
      />

      <Flex justify="space-between" align="flex-start" gap={2}>
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="md" color="gray.900">
              {format(parseISO(slot.date), 'M月d日(E)', { locale: ja })}
            </Text>
            {slot.is_all_day ? (
              <Badge colorScheme="gray">終日</Badge>
            ) : (
              <Text fontSize="sm" color="gray.700" fontWeight="medium">
                {slot.start_time} – {slot.end_time}
              </Text>
            )}
          </HStack>
          <Text fontSize="sm" color="gray.700" noOfLines={2}>
            {slot.reason}
          </Text>
        </VStack>

        <Tooltip
          label={isPast ? '過去のブロックは削除できません' : '削除'}
          hasArrow
          isDisabled={!isPast}
        >
          <IconButton
            aria-label="削除"
            icon={<Trash2 size={18} />}
            size="md"
            variant="ghost"
            colorScheme="red"
            isDisabled={isPast}
            onClick={() => onDelete(slot)}
          />
        </Tooltip>
      </Flex>
    </Box>
  );
}
