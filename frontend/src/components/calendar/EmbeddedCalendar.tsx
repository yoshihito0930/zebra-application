import { useState } from 'react';
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
import ReservationCalendar from './ReservationCalendar';
import CalendarSidePanel from './CalendarSidePanel';
import MobileReservationCalendar from './MobileReservationCalendar';
import DayDetailModal from './DayDetailModal';
import CreateReservationModal from '../reservation/CreateReservationModal';
import { useCalendar } from '../../hooks/useCalendar';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export interface EmbeddedCalendarProps {
  /** 対象スタジオID */
  studioId: string;
  /** 会員ログイン済みかどうか（埋め込み版は常に false） */
  isAuthenticated?: boolean;
  /**
   * 外側のページchrome（Container・見出し）を描画するか。
   * SPA では true、埋め込み版ではホストの <div> 内に収まるよう調整する。
   */
  showChrome?: boolean;
  /**
   * 「会員登録」リンククリック時の遷移。未指定ならリンクを表示しない。
   */
  onNavigateSignup?: () => void;
  /**
   * 「マイ予約」ボタンクリック時の遷移（会員のみ）。未指定ならボタンを表示しない。
   */
  onNavigateMyReservations?: () => void;
}

const getTodayString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/**
 * 予約カレンダーのオーケストレーター本体。
 * SPA の CalendarPage と、外部サイト埋め込みウィジェット（WidgetRoot）の両方から再利用される。
 * ルーター・認証ストアへの直接依存を持たず、すべてプロップ経由で受け取る。
 */
export default function EmbeddedCalendar({
  studioId,
  isAuthenticated = false,
  showChrome = true,
  onNavigateSignup,
  onNavigateMyReservations,
}: EmbeddedCalendarProps) {
  const toast = useToast();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');

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
  } = useCalendar(studioId, currentYear, currentMonth);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const { isOpen: isDayDetailOpen, onOpen: onDayDetailOpen, onClose: onDayDetailClose } = useDisclosure();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (isMobile) onDayDetailOpen();
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

  // ゲスト案内（SPA表示 かつ 未ログイン かつ 会員登録導線がある時のみ）
  // 埋め込みウィジェット（showChrome=false）ではカレンダー本体のみを表示するため出さない
  const guestBanner = showChrome && !isAuthenticated && onNavigateSignup && (
    <Alert status="info" variant="left-accent" borderRadius="md" py={2}>
      <AlertIcon />
      <Text fontSize="sm" color="gray.700">
        ゲストのままでも予約できます。
        <Link color="brand.600" fontWeight="semibold" ml={1} onClick={onNavigateSignup}>
          会員登録
        </Link>
        すると予約履歴の確認や簡単予約が利用できます。
      </Text>
    </Alert>
  );

  // ===== モバイルレイアウト =====
  if (isMobile) {
    return (
      <Box pb={6}>
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
              {/* タイトル/サブタイトルは SPA 表示時のみ（ウィジェットはカレンダーのみ） */}
              {showChrome && (
                <Box>
                  <Heading size="lg" color="brand.600" mb={1}>
                    予約カレンダー
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    空き状況を確認して、撮影を予約しましょう
                  </Text>
                </Box>
              )}

              {guestBanner}

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

        {/* 日付詳細モーダル (モバイル) */}
        {calendarData && selectedDate && (
          <DayDetailModal
            isOpen={isDayDetailOpen}
            onClose={onDayDetailClose}
            date={selectedDate}
            reservations={selectedDateReservations}
            onCreateReservation={handleCreateReservationFromDetail}
          />
        )}

        {/* 予約作成モーダル（公開カレンダーは常にゲスト予約） */}
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          studioId={studioId}
          initialDate={selectedDate ?? ''}
          initialStartTime={selectedStartTime}
          onSuccess={handleReservationSuccess}
          reservations={calendarData?.reservations || []}
          blockedSlots={calendarData?.blocked_slots || []}
          guestOnly
        />
      </Box>
    );
  }

  // ===== デスクトップレイアウト =====
  const desktopBody = (
    <VStack spacing={6} align="stretch">
      {/* タイトルセクション（SPA 表示時のみ。ウィジェットはカレンダーのみ表示） */}
      {showChrome && (
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
            {isAuthenticated && onNavigateMyReservations && (
              <Button
                variant="outline"
                colorScheme="brand"
                leftIcon={<ListChecks size={18} />}
                onClick={onNavigateMyReservations}
              >
                マイ予約
              </Button>
            )}
            <Button colorScheme="brand" leftIcon={<Plus size={18} />} onClick={handleCreateNew}>
              新規予約を作成
            </Button>
          </HStack>
        </Flex>
      )}

      {/* ゲスト案内 */}
      {guestBanner}

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
                studioId={studioId}
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

      {/* 予約作成モーダル（公開カレンダーは常にゲスト予約） */}
      <CreateReservationModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        studioId={studioId}
        initialDate={selectedDate ?? ''}
        initialStartTime={selectedStartTime}
        onSuccess={handleReservationSuccess}
        reservations={calendarData?.reservations || []}
        blockedSlots={calendarData?.blocked_slots || []}
        guestOnly
      />
    </VStack>
  );

  // chrome あり（SPA）: 中央寄せの Container でラップ
  if (showChrome) {
    return (
      <Container maxW="container.xl" py={8}>
        {desktopBody}
      </Container>
    );
  }

  // chrome なし（埋め込み）: ホストの <div> 内に収まるよう余白のみ
  return <Box py={4}>{desktopBody}</Box>;
}
