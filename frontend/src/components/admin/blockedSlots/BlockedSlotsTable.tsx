import {
  Badge,
  IconButton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { BlockedSlot } from '../../../types';

interface BlockedSlotsTableProps {
  slots: BlockedSlot[];
  onDelete: (slot: BlockedSlot) => void;
  isPast: (slot: BlockedSlot) => boolean;
}

export default function BlockedSlotsTable({
  slots,
  onDelete,
  isPast,
}: BlockedSlotsTableProps) {
  return (
    <Table size="md" variant="simple" bg="white">
      <Thead bg="gray.50">
        <Tr>
          <Th>日付</Th>
          <Th>時間帯</Th>
          <Th>理由</Th>
          <Th>作成日</Th>
          <Th w="80px" textAlign="center">
            操作
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {slots.map((slot) => {
          const past = isPast(slot);
          return (
            <Tr key={slot.blocked_slot_id} opacity={past ? 0.6 : 1}>
              <Td>
                <Text fontWeight="medium">
                  {format(parseISO(slot.date), 'M月d日(E)', { locale: ja })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {slot.date}
                </Text>
              </Td>
              <Td>
                {slot.is_all_day ? (
                  <Badge colorScheme="gray">終日</Badge>
                ) : (
                  <Text>
                    {slot.start_time} – {slot.end_time}
                  </Text>
                )}
              </Td>
              <Td>
                <Text noOfLines={2} maxW="360px">
                  {slot.reason}
                </Text>
              </Td>
              <Td>
                <Text fontSize="sm" color="gray.600">
                  {format(parseISO(slot.created_at), 'yyyy/M/d', { locale: ja })}
                </Text>
              </Td>
              <Td textAlign="center">
                <Tooltip
                  label={past ? '過去のブロックは削除できません' : '削除'}
                  hasArrow
                >
                  <IconButton
                    aria-label="削除"
                    icon={<Trash2 size={16} />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    isDisabled={past}
                    onClick={() => onDelete(slot)}
                  />
                </Tooltip>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
