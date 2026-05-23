import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { motion, useAnimation, useDragControls, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { CalendarReservation } from '../../types';

export type SheetSnap = 'peek' | 'half' | 'full';

interface BottomReservationSheetProps {
  selectedDate: string | null;
  reservations: CalendarReservation[];
  onSnapChange?: (snap: SheetSnap) => void;
  onCreateReservation?: (date: string) => void;
}

const getStatusVisuals = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { bar: 'var(--chakra-colors-green-500)', label: '本予約', text: 'green.700' };
    case 'tentative':
      return { bar: 'var(--chakra-colors-orange-500)', label: '仮予約', text: 'orange.700' };
    case 'pending':
      return { bar: 'var(--chakra-colors-brand-300)', label: '承認待ち', text: 'brand.700' };
    case 'scheduled':
      return { bar: 'var(--chakra-colors-blue-500)', label: 'ロケハン', text: 'blue.700' };
    case 'waitlisted':
      return { bar: 'var(--chakra-colors-purple-500)', label: '第2キープ', text: 'purple.700' };
    default:
      return { bar: 'var(--chakra-colors-gray-500)', label: '不明', text: 'gray.700' };
  }
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${month}月${day}日（${weekdays[d.getDay()]}）`;
};

const getTodayString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const useViewportHeight = () => {
  const [vh, setVh] = useState(() =>
    typeof window === 'undefined' ? 700 : window.visualViewport?.height ?? window.innerHeight,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setVh(window.visualViewport?.height ?? window.innerHeight);
    };
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return vh;
};

export default function BottomReservationSheet({
  selectedDate,
  reservations,
  onSnapChange,
  onCreateReservation,
}: BottomReservationSheetProps) {
  const vh = useViewportHeight();

  // CTA (約 88px) + シート見え量 (約 120px) を確保
  const PEEK_VISIBLE = 200;
  const points = useMemo(
    () => ({
      full: Math.round(vh * 0.1),
      half: Math.round(vh * 0.5),
      peek: Math.max(0, vh - PEEK_VISIBLE),
    }),
    [vh],
  );

  const y = useMotionValue(points.peek);
  const controls = useAnimation();
  const dragControls = useDragControls();
  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [reservations],
  );
  const lastSnapRef = useRef<SheetSnap>('peek');

  // ビューポートサイズ変更時に現在のスナップ位置にスナップしなおす
  useEffect(() => {
    controls.start({ y: points[lastSnapRef.current], transition: { duration: 0 } });
  }, [points, controls]);

  const emitSnap = useCallback(
    (snap: SheetSnap) => {
      if (lastSnapRef.current !== snap) {
        lastSnapRef.current = snap;
        onSnapChange?.(snap);
      }
    },
    [onSnapChange],
  );

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      const current = y.get();
      const velocity = info.velocity.y;

      const ordered: Array<{ key: SheetSnap; value: number }> = [
        { key: 'full', value: points.full },
        { key: 'half', value: points.half },
        { key: 'peek', value: points.peek },
      ];

      let nearestIndex = 0;
      let nearestDist = Math.abs(ordered[0].value - current);
      for (let i = 1; i < ordered.length; i++) {
        const d = Math.abs(ordered[i].value - current);
        if (d < nearestDist) {
          nearestIndex = i;
          nearestDist = d;
        }
      }

      let targetIndex = nearestIndex;
      if (velocity > 500 && targetIndex < ordered.length - 1) targetIndex += 1;
      if (velocity < -500 && targetIndex > 0) targetIndex -= 1;

      const target = ordered[targetIndex];
      controls.start({
        y: target.value,
        transition: { type: 'spring', stiffness: 300, damping: 32 },
      });
      emitSnap(target.key);
    },
    [controls, emitSnap, points, y],
  );

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      dragControls.start(event);
    },
    [dragControls],
  );

  const isToday = selectedDate === getTodayString();
  const reservationCount = sortedReservations.length;

  return (
    <Box display={{ base: 'block', md: 'none' }}>
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: points.full, bottom: points.peek }}
        dragElastic={0.05}
        dragMomentum={false}
        initial={{ y: points.peek }}
        animate={controls}
        style={{
          y,
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          height: '100vh',
          background: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
          zIndex: 30,
          touchAction: 'none',
        }}
        onDragEnd={handleDragEnd}
      >
        {/* ハンドル + ヘッダー (ドラッグ可能領域) */}
        <Box
          onPointerDown={startDrag}
          pt={2}
          pb={3}
          px={5}
          cursor="grab"
          sx={{ touchAction: 'none' }}
        >
          <Flex justify="center" pb={2}>
            <Box w="36px" h="4px" bg="gray.300" borderRadius="full" />
          </Flex>
          {selectedDate ? (
            <Flex justify="space-between" align="flex-start">
              <Box>
                <Text as="h2" fontSize="xl" fontWeight="bold" color="gray.900" lineHeight="1.2">
                  {formatDate(selectedDate)}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {reservationCount > 0 ? `${reservationCount}件の予約` : '予約はまだありません'}
                </Text>
              </Box>
              {isToday && (
                <Badge
                  bg="brand.300"
                  color="white"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="xs"
                  textTransform="none"
                >
                  今日
                </Badge>
              )}
            </Flex>
          ) : (
            <Text fontSize="sm" color="gray.500">
              日付をタップして詳細を確認できます
            </Text>
          )}
        </Box>

        {/* 予約カードリスト (スクロール領域) */}
        <Box
          overflowY="auto"
          h={`calc(100vh - 110px)`}
          px={5}
          pt={2}
          pb={32}
          sx={{ WebkitOverflowScrolling: 'touch' }}
        >
          <VStack spacing={2} align="stretch">
            {sortedReservations.length === 0 ? (
              <VStack spacing={2} py={6} align="center" color="gray.400">
                <Text fontSize="sm">この日に予約はありません</Text>
              </VStack>
            ) : (
              sortedReservations.map((reservation) => {
                const v = getStatusVisuals(reservation.status);
                return (
                  <Box
                    key={reservation.reservation_id}
                    bg="brand.50"
                    borderLeftWidth="4px"
                    borderLeftColor={v.bar}
                    borderRadius="md"
                    px={4}
                    py={3}
                  >
                    <HStack justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.700">
                        {reservation.start_time} – {reservation.end_time}
                      </Text>
                    </HStack>
                    <Text fontWeight="bold" color={v.text} mt={0.5}>
                      {v.label}
                    </Text>
                    {reservation.reservation_type === 'second_keep' && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        ※ 第1候補キャンセル時に繰り上げ
                      </Text>
                    )}
                  </Box>
                );
              })
            )}

            {selectedDate && onCreateReservation && (
              <Button
                colorScheme="brand"
                variant="outline"
                size="lg"
                borderRadius="full"
                leftIcon={<Plus size={18} />}
                onClick={() => onCreateReservation(selectedDate)}
                mt={2}
              >
                この日の予約を作成する
              </Button>
            )}
          </VStack>
        </Box>
      </motion.div>
    </Box>
  );
}
