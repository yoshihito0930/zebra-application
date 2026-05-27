import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Button,
  Alert,
  AlertIcon,
  Flex,
  HStack,
  Grid,
  GridItem,
  Link,
  useToast,
  useDisclosure,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Plus, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ReservationCalendar from '../../components/calendar/ReservationCalendar';
import CalendarSidePanel from '../../components/calendar/CalendarSidePanel';
import MobileReservationCalendar from '../../components/calendar/MobileReservationCalendar';
import BottomReservationSheet, {
  type SheetSnap,
} from '../../components/calendar/BottomReservationSheet';
import CreateReservationModal from '../../components/reservation/CreateReservationModal';
import DayDetailModal from '../../components/calendar/DayDetailModal';
import { useCalendar } from '../../hooks/useCalendar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

const getTodayString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');

  const layout = useBreakpointValue(
    { base: 'mobile' as const, md: 'desktop' as const },
    { fallback: 'desktop', ssr: false },
  );
  const isMobile = layout === 'mobile';
  const isXl = useBreakpointValue({ base: false, xl: true }, { fallback: 'base' });

  const {
    data: calendarData,
    isLoading,
    error,
  } = useCalendar(STUDIO_ID, currentYear, currentMonth);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const { isOpen: isDayDetailOpen, onOpen: onDayDetailOpen, onClose: onDayDetailClose } = useDisclosure();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  // モバイル初期表示時、selectedDate がまだなら今日を選んでおく
  useEffect(() => {
    if (isMobile && selectedDate === null) {
      setSelectedDate(getTodayString());
    }
  }, [isMobile, selectedDate]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    if (!isXl && !isMobile) onDayDetailOpen();
  };

  const handleCreateReservationFromDetail = (date: string, startTime?: string) => {
    setSelectedDate(date);
    setSelectedStartTime(startTime || '');
    onModalOpen();
  };

  const handleSidePanelCreate = (date: string) => {
    setSelectedDate(date);
    setSelectedStartTime('');
    onModalOpen();
  };

  const handleCreateNew = () => {
    if (!selectedDate) {
      if (isMobile) {
        setSelectedDate(getTodayString());
      } else {
        toast({
          title: '日付を選択してください',
          description: 'カレンダーから予約したい日付をクリックしてください。',
          status: 'info',
          duration: 2500,
          isClosable: true,
        });
        return;
      }
    }
    setSelectedStartTime('');
    onModalOpen();
  };

  const handleReservationSuccess = () => {
    toast({
      title: '予約を作成しました',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const selectedDateReservations =
    selectedDate && calendarData
      ? calendarData.reservations.filter((r) => r.date === selectedDate)
      : [];

  // ===== モバイルレイアウト =====
  if (isMobile) {
    return (
      <Box pb={28}>
        {isLoading && (
          <Box pt={6} px={4}>
            <LoadingSpinner />
          </Box>
        )}

        {error && !isLoading && (
          <Box pt={6} px={4}>
            <ErrorMessage
              message={error instanceof Error ? error.message : 'カレンダーの取得に失敗しました'}
            />
          </Box>
        )}

        {!isLoading && !error && calendarData && (
          <Box px={4} pt={4} pb={6}>
            <VStack spacing={4} align="stretch">
              <Box>
                <Heading size="lg" color="brand.600" mb={1}>
                  予約カレンダー
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  空き状況を確認して、撮影を予約しましょう
                </Text>
              </Box>

              {!isAuthenticated && (
                <Alert status="info" variant="left-accent" borderRadius="md" py={2}>
                  <AlertIcon />
                  <Text fontSize="sm" color="gray.700">
                    ゲストのままでも予約できます。
                    <Link
                      color="brand.600"
                      fontWeight="semibold"
                      ml={1}
                      onClick={() => navigate('/signup')}
                    >
                      会員登録
                    </Link>
                    すると予約履歴の確認や簡単予約が利用できます。
                  </Text>
                </Alert>
              )}

              <MobileReservationCalendar
                reservations={calendarData.reservations}
                blockedSlots={calendarData.blocked_slots}
                currentYear={currentYear}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
              />
            </VStack>
          </Box>
        )}

        {/* ボトムシート */}
        {calendarData && (
          <BottomReservationSheet
            selectedDate={selectedDate}
            reservations={selectedDateReservations}
            onSnapChange={setSheetSnap}
            onCreateReservation={(date) => {
              setSelectedDate(date);
              setSelectedStartTime('');
              onModalOpen();
            }}
          />
        )}

        {/* スティッキー CTA (peek 時のみ表示) */}
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          px={4}
          pb={4}
          pt={3}
          zIndex={20}
          pointerEvents="none"
          opacity={sheetSnap === 'peek' ? 1 : 0}
          transform={sheetSnap === 'peek' ? 'translateY(0)' : 'translateY(8px)'}
          transition="opacity 0.18s ease, transform 0.18s ease"
          display={{ base: 'block', md: 'none' }}
        >
          <Button
            colorScheme="brand"
            size="lg"
            w="full"
            borderRadius="full"
            leftIcon={<Plus size={20} />}
            onClick={handleCreateNew}
            pointerEvents="auto"
            boxShadow="0 8px 20px rgba(85, 168, 137, 0.35)"
          >
            新規予約を作成
          </Button>
        </Box>

        {/* 予約作成モーダル */}
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          studioId={STUDIO_ID}
          initialDate={selectedDate ?? ''}
          initialStartTime={selectedStartTime}
          onSuccess={handleReservationSuccess}
          reservations={calendarData?.reservations || []}
          blockedSlots={calendarData?.blocked_slots || []}
        />
      </Box>
    );
  }

  // ===== デスクトップレイアウト (既存) =====
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* タイトルセクション */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', md: 'center' }}
          gap={4}
        >
          <Box>
            <Heading size="xl" color="brand.600" mb={1}>
              予約カレンダー
            </Heading>
            <Text color="gray.600" fontSize="sm">
              空き状況を確認して、撮影を予約しましょう
            </Text>
          </Box>
          <HStack spacing={3}>
            {isAuthenticated && (
              <Button
                variant="outline"
                colorScheme="brand"
                leftIcon={<ListChecks size={18} />}
                onClick={() => navigate('/customer/reservations')}
              >
                マイ予約
              </Button>
            )}
            <Button
              colorScheme="brand"
              leftIcon={<Plus size={18} />}
              onClick={handleCreateNew}
            >
              新規予約を作成
            </Button>
          </HStack>
        </Flex>

        {/* ゲスト案内 */}
        {!isAuthenticated && (
          <Alert status="info" variant="left-accent" borderRadius="md" py={2}>
            <AlertIcon />
            <Text fontSize="sm" color="gray.700">
              ゲストのままでも予約できます。
              <Link
                color="brand.600"
                fontWeight="semibold"
                ml={1}
                onClick={() => navigate('/signup')}
              >
                会員登録
              </Link>
              すると予約履歴の確認や簡単予約が利用できます。
            </Text>
          </Alert>
        )}

        {/* メインボディ */}
        {isLoading && <LoadingSpinner />}

        {error && !isLoading && (
          <ErrorMessage
            message={error instanceof Error ? error.message : 'カレンダーの取得に失敗しました'}
          />
        )}

        {!isLoading && !error && calendarData && (
          <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 3fr) 1fr' }} gap={6}>
            <GridItem>
              <Box bg="white" p={6} borderRadius="lg" shadow="md">
                <ReservationCalendar
                  studioId={STUDIO_ID}
                  reservations={calendarData.reservations}
                  blockedSlots={calendarData.blocked_slots}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onDateClick={handleDateClick}
                  onMonthChange={handleMonthChange}
                />
              </Box>
            </GridItem>
            <GridItem display={{ base: 'none', xl: 'block' }}>
              <CalendarSidePanel
                selectedDate={selectedDate}
                reservations={selectedDateReservations}
                onCreateReservation={handleSidePanelCreate}
              />
            </GridItem>
          </Grid>
        )}

        {/* 日付詳細モーダル (md-lg 用) */}
        {calendarData && selectedDate && (
          <DayDetailModal
            isOpen={isDayDetailOpen}
            onClose={onDayDetailClose}
            date={selectedDate}
            reservations={selectedDateReservations}
            onCreateReservation={handleCreateReservationFromDetail}
          />
        )}

        {/* 予約作成モーダル */}
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          studioId={STUDIO_ID}
          initialDate={selectedDate ?? ''}
          initialStartTime={selectedStartTime}
          onSuccess={handleReservationSuccess}
          reservations={calendarData?.reservations || []}
          blockedSlots={calendarData?.blocked_slots || []}
        />
      </VStack>
    </Container>
  );
}
