import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Select,
  Spinner,
  Text,
  VStack,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subYears,
} from 'date-fns';
import AdminMobileFab from '../../components/layouts/AdminMobileFab';
import BlockedSlotFormModal from '../../components/admin/blockedSlots/BlockedSlotFormModal';
import BlockedSlotsTable from '../../components/admin/blockedSlots/BlockedSlotsTable';
import DeleteBlockedSlotDialog from '../../components/admin/blockedSlots/DeleteBlockedSlotDialog';
import MobileBlockedSlotCard from '../../components/admin/blockedSlots/MobileBlockedSlotCard';
import { useBlockedSlots } from '../../hooks/useBlockedSlots';
import type { BlockedSlot } from '../../types';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

type FilterPreset = 'future' | 'current' | 'past';

const todayYMD = (): string => format(new Date(), 'yyyy-MM-dd');

interface DateRange {
  start_date: string;
  end_date: string;
}

const getRangeForPreset = (preset: FilterPreset): DateRange => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  switch (preset) {
    case 'current':
      return {
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    case 'past':
      return {
        start_date: format(subYears(today, 1), 'yyyy-MM-dd'),
        end_date: format(monthStart, 'yyyy-MM-dd'),
      };
    case 'future':
    default:
      return {
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(addMonths(monthStart, 6), 'yyyy-MM-dd'),
      };
  }
};

export default function BlockedSlotsPage() {
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('future');
  const [selectedSlot, setSelectedSlot] = useState<BlockedSlot | null>(null);

  const createModal = useDisclosure();
  const deleteDialog = useDisclosure();

  const range = useMemo(() => getRangeForPreset(filterPreset), [filterPreset]);

  const {
    data: slots = [],
    isLoading,
    error,
  } = useBlockedSlots({
    studio_id: STUDIO_ID,
    start_date: range.start_date,
    end_date: range.end_date,
  });

  // 日付昇順 → 開始時刻昇順 (終日は最早扱い)
  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aTime = a.is_all_day ? '00:00' : a.start_time ?? '00:00';
      const bTime = b.is_all_day ? '00:00' : b.start_time ?? '00:00';
      return aTime.localeCompare(bTime);
    });
  }, [slots]);

  const today = todayYMD();
  const isPast = (slot: BlockedSlot) => slot.date < today;

  const handleDeleteClick = (slot: BlockedSlot) => {
    setSelectedSlot(slot);
    deleteDialog.onOpen();
  };

  const handleDeleteDialogClose = () => {
    deleteDialog.onClose();
    // ダイアログ閉じた後に少し残してアニメーションを邪魔しないよう即時クリアは控えめに
    setSelectedSlot(null);
  };

  return (
    <Container
      maxW={{ base: 'full', md: 'container.xl' }}
      py={{ base: 4, md: 6 }}
      px={{ base: 3, md: 6 }}
    >
      <VStack spacing={4} align="stretch" pb={isMobile ? 24 : 0}>
        {/* ヘッダー */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          gap={3}
        >
          <Box>
            <Heading size={{ base: 'md', md: 'lg' }}>ブロック枠管理</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              休業日や設備メンテナンスなど、予約不可な時間帯を設定します。
            </Text>
          </Box>
          {!isMobile && (
            <Button
              colorScheme="brand"
              leftIcon={<Plus size={16} />}
              onClick={createModal.onOpen}
            >
              新規ブロック
            </Button>
          )}
        </Flex>

        {/* フィルタ + 件数 */}
        <HStack
          justify="space-between"
          align="center"
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          px={3}
          py={2}
        >
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">
              期間:
            </Text>
            <Select
              size="sm"
              maxW="180px"
              value={filterPreset}
              onChange={(e) => setFilterPreset(e.target.value as FilterPreset)}
            >
              <option value="future">今月以降（6ヶ月）</option>
              <option value="current">今月のみ</option>
              <option value="past">過去（直近1年）</option>
            </Select>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {isLoading ? '...' : `${sortedSlots.length}件`}
          </Text>
        </HStack>

        {/* 本体 */}
        {isLoading ? (
          <Flex justify="center" py={10}>
            <Spinner size="lg" color="brand.500" />
          </Flex>
        ) : error ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            ブロック枠の取得に失敗しました
          </Alert>
        ) : sortedSlots.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            この期間のブロック枠はありません
          </Alert>
        ) : isMobile ? (
          <VStack spacing={2} align="stretch">
            {sortedSlots.map((slot) => (
              <MobileBlockedSlotCard
                key={slot.blocked_slot_id}
                slot={slot}
                onDelete={handleDeleteClick}
                isPast={isPast(slot)}
              />
            ))}
          </VStack>
        ) : (
          <Box
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.200"
            overflow="hidden"
          >
            <BlockedSlotsTable
              slots={sortedSlots}
              onDelete={handleDeleteClick}
              isPast={isPast}
            />
          </Box>
        )}
      </VStack>

      {/* モバイル FAB */}
      {isMobile && (
        <AdminMobileFab onClick={createModal.onOpen} label="ブロックを追加" />
      )}

      {/* モーダル */}
      <BlockedSlotFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        studioId={STUDIO_ID}
      />
      <DeleteBlockedSlotDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteDialogClose}
        slot={selectedSlot}
      />
    </Container>
  );
}
