import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Textarea,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  Stack,
  Text,
  Box,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { usePlans, useOptions } from '../../hooks/usePlans';
import { useCreateReservation, useCreateGuestReservation } from '../../hooks/useReservations';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { useAuthStore } from '../../stores/authStore';
import { DatePickerField, TimePickerField } from './DateTimePickerFields';
import { useWidgetPortalRef } from '../../widget/WidgetPortalContext';
import type { BlockedSlot, CreateReservationRequest, Reservation } from '../../types';
import { ApiErrorCode } from '../../types';
import { getErrorMessage, getErrorCode } from '../../services/api';
import { INSURANCE_PRICE, INSURANCE_TAX } from '../../utils/reservationPrice';

// 必須入力欄を示す赤いアスタリスク
const RequiredMark = () => (
  <Box as="span" color="red.500" aria-hidden="true">
    *
  </Box>
);

// 時刻を分単位に変換するヘルパー
const timeToMinutes = (timeStr: string): number => {
  const [hourStr, minStr] = timeStr.split(':');
  return parseInt(hourStr) * 60 + parseInt(minStr);
};

// 会員予約バリデーションスキーマ
const memberReservationSchema = z.object({
  studio_id: z.string().min(1, 'スタジオIDが必要です'),
  reservation_type: z.enum(['regular', 'tentative', 'location_scout', 'second_keep'], {
    message: '予約種別を選択してください',
  }),
  plan_id: z.string().min(1, 'プランを選択してください'),
  date: z.string().min(1, '日付を選択してください'),
  start_time: z.string().min(1, '開始時刻を選択してください'),
  end_time: z.string().min(1, '終了時刻を選択してください'),
  shooting_type: z.array(z.enum(['stills', 'video', 'music_with_restrictions'])).min(1, '撮影種別を選択してください'),
  shooting_details: z.string().min(1, '撮影詳細を入力してください').max(500, '撮影詳細は500文字以内で入力してください'),
  photographer_name: z.string().min(1, 'カメラマン名を入力してください').max(100, 'カメラマン名は100文字以内で入力してください'),
  number_of_people: z.number().int().min(1, '参加人数は1人以上で入力してください').max(100, '参加人数は100人以下で入力してください'),
  needs_protection: z.boolean(),
  equipment_insurance: z.boolean(),
  options: z.array(z.string()).optional(),
  note: z.string().max(1000, '備考は1000文字以内で入力してください').optional(),
}).refine((data) => {
  // 時刻範囲チェック: 開始時刻 < 終了時刻
  const startMin = timeToMinutes(data.start_time);
  const endMin = timeToMinutes(data.end_time);
  return startMin < endMin;
}, {
  message: '開始時刻は終了時刻より前に設定してください',
  path: ['start_time'],
}).refine((data) => {
  // 最低利用時間2時間のチェック
  const startMin = timeToMinutes(data.start_time);
  const endMin = timeToMinutes(data.end_time);
  const duration = endMin - startMin;
  return duration >= 120;
}, {
  message: '最低利用時間は2時間です',
  path: ['start_time'],
});

// ゲスト予約バリデーションスキーマ
const guestReservationSchema = memberReservationSchema.extend({
  is_guest: z.literal(true),
  guest_name: z.string().min(1, 'お名前を入力してください').max(100, 'お名前は100文字以内で入力してください'),
  guest_email: z.string().email('有効なメールアドレスを入力してください'),
  guest_phone: z.string().min(1, '電話番号を入力してください').regex(/^[0-9-]+$/, '電話番号は数字とハイフンで入力してください'),
  guest_company: z.string().max(200, '会社名は200文字以内で入力してください').optional(),
});

// 統合スキーマ
// @ts-expect-error - kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createReservationSchema = z.union([memberReservationSchema, guestReservationSchema]);

// @ts-expect-error - kept for type reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MemberReservationFormData = z.infer<typeof memberReservationSchema>;
type GuestReservationFormData = z.infer<typeof guestReservationSchema>;
// Union type for the form - use the broader guest type to include all fields but make is_guest optional
type ReservationFormData = Omit<GuestReservationFormData, 'is_guest'> & { is_guest?: boolean };

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  initialDate?: string;
  initialStartTime?: string;
  onSuccess?: () => void;
  reservations?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  }>;
  blockedSlots?: BlockedSlot[];
  /**
   * 公開／ウィジェット文脈で使うフラグ。true のときは会員予約タブを出さず、
   * 常にゲスト予約（POST /reservations/guest）として作成する。
   * admin/staff の管理画面では false（既定）のまま会員予約パスも使える。
   */
  guestOnly?: boolean;
}

export default function CreateReservationModal({
  isOpen,
  onClose,
  studioId,
  initialDate,
  initialStartTime,
  onSuccess,
  reservations = [],
  blockedSlots = [],
  guestOnly = false,
}: CreateReservationModalProps) {
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  // ウィジェット（Shadow DOM）では shadow 内へ Portal する。SPA では undefined → document.body。
  const portalRef = useWidgetPortalRef();
  // 会員予約タブを表示するか。guestOnly（公開／ウィジェット）のときは常にゲストのみ。
  const showMemberOption = isAuthenticated && !guestOnly;
  const [tabIndex, setTabIndex] = useState(0); // 0: 会員, 1: ゲスト
  // const [guestToken, setGuestToken] = useState<string | null>(null);

  // 第2キープ切替の確認ダイアログ。
  // SECOND_KEEP_ONLY（既存仮予約のバッファゾーンに重なる）を受けたときに開く。
  const [secondKeepConfirmOpen, setSecondKeepConfirmOpen] = useState(false);
  // 直近の送信ペイロードと送信経路（会員/ゲスト）を保持し、第2キープへ切替えて再送信する。
  const pendingSubmitRef = useRef<{ data: CreateReservationRequest; isGuest: boolean } | null>(null);
  const cancelSecondKeepRef = useRef<HTMLButtonElement>(null);

  // React Queryでプラン・オプション取得
  const { data: plans = [], isLoading: isLoadingPlans, error: plansError } = usePlans(studioId);
  const { data: options = [], isLoading: isLoadingOptions, error: optionsError } = useOptions(studioId);

  // デバッグ用ログ
  useEffect(() => {
    console.log('Plans loaded:', plans);
    console.log('Options loaded:', options);
  }, [plans, options]);

  // React Queryで予約作成（会員 / ゲストで別エンドポイントを使う）
  const createMutation = useCreateReservation();
  const createGuestMutation = useCreateGuestReservation();

  const isLoadingData = isLoadingPlans || isLoadingOptions;
  const dataError = plansError || optionsError;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReservationFormData>({
    shouldUnregister: false, // フィールドがDOMから削除されても値を保持
    defaultValues: {
      studio_id: studioId,
      reservation_type: 'regular',
      plan_id: '',
      date: initialDate || '',
      start_time: '',
      end_time: '',
      shooting_type: [],
      shooting_details: '',
      photographer_name: '',
      number_of_people: 1,
      needs_protection: true,
      equipment_insurance: true,
      options: [],
      note: '',
      is_guest: false,
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_company: '',
    },
  });

  // 時と分を分けて管理するためのstate
  const [startHour, setStartHour] = useState<number | null>(null);
  const [startMinute, setStartMinute] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [endMinute, setEndMinute] = useState<number | null>(null);

  // モーダルが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      // タブを先頭にリセット（会員タブがある場合は会員タブ）
      setTabIndex(0);
      // 初期日付設定
      if (initialDate) {
        setValue('date', initialDate);
      }
      // 初期開始時刻設定
      if (initialStartTime) {
        const [hourStr, minStr] = initialStartTime.split(':');
        setStartHour(parseInt(hourStr));
        setStartMinute(parseInt(minStr));
      }
    } else {
      // モーダルが閉じられたら時刻をリセット
      setStartHour(null);
      setStartMinute(null);
      setEndHour(null);
      setEndMinute(null);
    }
  }, [isOpen, initialDate, initialStartTime, setValue]);

  // 選択中のプラン・オプション・予約種別・日付
  const selectedPlanId = watch('plan_id');
  const selectedOptionIds = watch('options') || [];
  const selectedReservationType = watch('reservation_type');
  const selectedDate = watch('date');

  // 利用時間を計算（時間単位、日跨ぎ対応）
  const calculateUsageHours = (): number => {
    if (startHour === null || startMinute === null || endHour === null || endMinute === null) {
      return 0;
    }

    const startTotalMin = startHour * 60 + startMinute;
    let endTotalMin = endHour * 60 + endMinute;

    // 終了時刻が開始時刻以下の場合、日跨ぎとして24時間加算
    if (endTotalMin <= startTotalMin) {
      endTotalMin += 24 * 60;
    }

    const durationMin = endTotalMin - startTotalMin;
    const hours = durationMin / 60;

    return hours;
  };

  const insuranceEnabled = watch('equipment_insurance');

  // 料金計算（プラン料金×利用時間＋オプション料金＋機材保険）
  const calculateTotalPrice = () => {
    const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);
    if (!selectedPlan)
      return { subtotal: 0, tax: 0, total: 0, hours: 0, insuranceTotal: 0 };

    const usageHours = calculateUsageHours();

    // プラン料金 = 時間単価 × 利用時間
    const planPrice = selectedPlan.price * usageHours;
    const planTax = Math.floor(planPrice * selectedPlan.tax_rate);

    // オプション料金（時間によらず固定）
    const selectedOptions = options.filter((o) => selectedOptionIds.includes(o.option_id));
    const optionsPrice = selectedOptions.reduce((total, o) => total + o.price, 0);
    const optionsTax = selectedOptions.reduce((total, o) => total + Math.floor(o.price * o.tax_rate), 0);

    // 機材保険（チェック時のみ加算）
    const insuranceTotal = insuranceEnabled ? INSURANCE_PRICE : 0;
    const insuranceTax = insuranceEnabled ? INSURANCE_TAX : 0;

    const subtotal = planPrice + optionsPrice + insuranceTotal;
    const tax = planTax + optionsTax + insuranceTax;
    const total = subtotal + tax;

    return { subtotal, tax, total, hours: usageHours, insuranceTotal };
  };

  const priceInfo = calculateTotalPrice();

  // ブロック対象の時間範囲を集計（ブロック枠 + 既存予約バッファ）
  const getBlockedTimeRanges = (date: string, reservationType: string) => {
    const ranges: Array<{
      startMin: number;
      endMin: number;
      source: 'reservation' | 'blocked';
      label: string;
    }> = [];

    // ブロック枠は予約種別に関係なく常に適用（バッファなし、指定時間そのまま）
    for (const b of blockedSlots.filter((s) => s.date === date)) {
      if (b.is_all_day) {
        ranges.push({
          startMin: 0,
          endMin: 24 * 60,
          source: 'blocked',
          label: `${b.reason}（終日）`,
        });
      } else if (b.start_time && b.end_time) {
        ranges.push({
          startMin: timeToMinutes(b.start_time),
          endMin: timeToMinutes(b.end_time),
          source: 'blocked',
          label: `${b.reason} ${b.start_time}-${b.end_time}`,
        });
      }
    }

    // 既存予約の前後1時間バッファは regular/tentative のみ
    if (reservationType !== 'second_keep' && reservationType !== 'location_scout') {
      const dateReservations = reservations.filter(
        (r) => r.date === date && (r.status === 'confirmed' || r.status === 'tentative')
      );

      for (const reservation of dateReservations) {
        const startMin = timeToMinutes(reservation.start_time);
        const endMin = timeToMinutes(reservation.end_time);

        ranges.push({
          startMin: Math.max(0, startMin - 60),
          endMin: Math.min(24 * 60, endMin + 60),
          source: 'reservation',
          label: `${reservation.start_time}〜${reservation.end_time}の予約があります`,
        });
      }
    }

    return ranges;
  };

  // 時刻（時＋分）が無効かどうかをチェック
  const isTimeSlotDisabled = (hour: number, minute: number, blockedRanges: Array<{ startMin: number; endMin: number }>) => {
    const totalMin = hour * 60 + minute;

    return blockedRanges.some((range) => {
      // 時刻がブロック範囲内にあるかチェック
      return totalMin >= range.startMin && totalMin < range.endMin;
    });
  };

  // 「時」全ての分(0/15/30/45)がブロックされているか
  const isHourFullyBlocked = (
    hour: number,
    blockedRanges: Array<{ startMin: number; endMin: number }>
  ) =>
    blockedRanges.length > 0 &&
    minuteOptions.every((m) => isTimeSlotDisabled(hour, m, blockedRanges));

  // [startMin, endMin) がブロック範囲と交差するか
  const rangeIntersectsBlocked = (
    startMin: number,
    endMin: number,
    blockedRanges: Array<{ startMin: number; endMin: number }>
  ) => blockedRanges.some((r) => startMin < r.endMin && endMin > r.startMin);

  // 終了時刻スロットが無効か（exclusive end）
  const isEndTimeSlotDisabled = (
    hour: number,
    minute: number,
    blockedRanges: Array<{ startMin: number; endMin: number }>
  ) => {
    const endTotalMin = hour * 60 + minute;
    // 終了時刻自体がブロック範囲の内側に着地する場合 (startMin < e <= endMin)
    if (blockedRanges.some((r) => endTotalMin > r.startMin && endTotalMin <= r.endMin)) {
      return true;
    }
    if (startHour === null || startMinute === null) return false;
    const startTotalMin = startHour * 60 + startMinute;
    if (endTotalMin <= startTotalMin) return false; // 日跨ぎ扱いは別途
    return rangeIntersectsBlocked(startTotalMin, endTotalMin, blockedRanges);
  };

  // 現在の予約種別と日付に基づいてブロックされた時間帯を取得
  const blockedTimeRanges = getBlockedTimeRanges(selectedDate || '', selectedReservationType);

  // バナー表示用: 予約・ブロック枠の重複範囲をメッセージ化
  const blockedRangeMessages = (() => {
    if (!selectedDate || blockedTimeRanges.length === 0) return [];
    return blockedTimeRanges.map((r) =>
      r.source === 'blocked' ? `${r.label} はブロックされています` : r.label
    );
  })();

  // タブ変更時の処理
  // 会員タブが無い（ゲスト専用）ときはタブが「ゲスト」のみ（index=0）なので常にゲスト。
  // 会員タブがあるときのみ index===1 でゲスト判定する。
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    setValue('is_guest', !showMemberOption || index === 1);
  };

  // フォーム送信
  const onSubmit = async (data: ReservationFormData) => {
    // バリデーション
    // ゲスト専用文脈では常にゲスト扱い。会員タブがあるときのみタブ index で判定する。
    const isGuest = !showMemberOption || tabIndex === 1;
    const schema = isGuest ? guestReservationSchema : memberReservationSchema;

    const result = schema.safeParse({
      ...data,
      is_guest: isGuest,
    });

    if (!result.success) {
      console.error('Validation error:', result.error);
      const firstError = result.error.issues[0];
      toast({
        title: 'バリデーションエラー',
        description: firstError?.message || '入力内容を確認してください',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const validatedData = result.data;

    const reservationData: CreateReservationRequest = {
      ...validatedData,
      options: validatedData.options || [],
      shooting_type: validatedData.shooting_type,
    };

    submitReservation(reservationData, isGuest);
  };

  // 予約作成成功時の共通処理（初回送信・第2キープ再送信から呼ぶ）
  const handleSubmitSuccess = (result: Reservation, isGuest: boolean) => {
    if (isGuest && result.guest_token) {
      toast({
        title: '予約を作成しました',
        description: '予約確認用のリンクをメールで送信しました。メールをご確認ください。',
        status: 'success',
        duration: 8000,
        isClosable: true,
      });
    } else {
      toast({
        title: '予約を作成しました',
        description: '予約の承認をお待ちください',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }

    pendingSubmitRef.current = null;
    reset();
    onClose();
    onSuccess?.();
  };

  // エラートーストを表示する共通処理
  const showErrorToast = (err: unknown) => {
    toast({
      title: 'エラー',
      description: getErrorMessage(err) || '予約の作成に失敗しました',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  // 予約を送信する。isRetry=true は第2キープ切替後の再送信で、
  // SECOND_KEEP_ONLY を再度受けてもダイアログを再展開せずエラートーストにフォールバックする。
  const submitReservation = (
    data: CreateReservationRequest,
    isGuest: boolean,
    isRetry = false
  ) => {
    pendingSubmitRef.current = { data, isGuest };

    const mutationOptions = {
      onSuccess: (result: Reservation) => handleSubmitSuccess(result, isGuest),
      onError: (err: unknown) => {
        // 既存仮予約のバッファゾーンに重なる申込（第2キープなら作成可）。
        // 初回送信のときだけ切替確認 CTA を表示する。
        if (!isRetry && getErrorCode(err) === ApiErrorCode.SecondKeepOnly) {
          setSecondKeepConfirmOpen(true);
          return;
        }
        // BUFFER_TIME_CONFLICT（予約不可）やその他のエラーはトーストで表示。
        showErrorToast(err);
      },
    };

    // ゲストは認証不要の /reservations/guest、会員は /reservations を叩く
    if (isGuest) {
      createGuestMutation.mutate(data, mutationOptions);
    } else {
      createMutation.mutate(data, mutationOptions);
    }
  };

  // 第2キープ切替確認ダイアログで「第2キープで予約する」を押したとき。
  // 保持したペイロードの reservation_type を second_keep に上書きして再送信する。
  const handleConfirmSecondKeep = () => {
    setSecondKeepConfirmOpen(false);
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    submitReservation(
      { ...pending.data, reservation_type: 'second_keep' },
      pending.isGuest,
      true
    );
  };

  // モーダルを閉じる
  const handleClose = () => {
    reset();
    setTabIndex(0); // タブをリセット
    setSecondKeepConfirmOpen(false); // 第2キープ確認ダイアログを閉じる
    pendingSubmitRef.current = null; // 保持した送信ペイロードを破棄
    // setGuestToken(null); // ゲストトークンをリセット
    onClose();
  };

  // 時間選択肢（0〜23時、分は00/15/30/45）
  const startHourOptions = Array.from({ length: 24 }, (_, i) => i); // 0-23
  const endHourOptions = Array.from({ length: 25 }, (_, i) => i); // 0-24
  const minuteOptions = [0, 15, 30, 45];

  // 時と分をHH:MM形式に変換（日跨ぎ対応）
  const formatTimeString = (hour: number | null, minute: number | null, isEndTime: boolean = false): string => {
    if (hour === null || minute === null) return '';

    // 終了時刻の場合、日跨ぎ判定を行う
    let adjustedHour = hour;
    if (isEndTime && startHour !== null && startMinute !== null) {
      const startTotalMin = startHour * 60 + startMinute;
      const endTotalMin = hour * 60 + minute;

      // 終了時刻が開始時刻以下の場合、翌日として扱う（24時間加算）
      if (endTotalMin <= startTotalMin) {
        adjustedHour = hour + 24;
      }
    }

    return `${String(adjustedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  // 時刻が日跨ぎかどうか判定
  const isOvernightTime = (hour: number | null): boolean => {
    if (hour === null || startHour === null || startMinute === null || endMinute === null) return false;

    const startTotalMin = startHour * 60 + startMinute;
    const endTotalMin = hour * 60 + endMinute;

    return endTotalMin <= startTotalMin;
  };

  // 時刻選択時にフォームの値を更新
  useEffect(() => {
    const startTimeStr = formatTimeString(startHour, startMinute, false);
    const endTimeStr = formatTimeString(endHour, endMinute, true);

    if (startTimeStr) {
      setValue('start_time', startTimeStr);
    }
    if (endTimeStr) {
      setValue('end_time', endTimeStr);
    }
  }, [startHour, startMinute, endHour, endMinute, setValue, formatTimeString]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      portalProps={portalRef ? { containerRef: portalRef } : undefined}
    >
      <ModalOverlay />
      <ModalContent as="form" id="create-reservation-form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>新規予約作成</ModalHeader>
        {/* onClick で handleClose を明示し、×でもフォーム状態の後始末（reset / tabIndex）が
            走るようにする（フッターのキャンセルと挙動を統一）。
            ※ かつてウィジェットで svg がクリックを奪う/ヘッダーが重なる問題があったが、
              現在は Shadow DOM 隔離 + resetCSS でホスト CSS が侵入しなくなり解消済み。 */}
        <ModalCloseButton onClick={handleClose} />
        <ModalBody>
            {isLoadingData && <LoadingSpinner />}

            {dataError && !isLoadingData && (
              <ErrorMessage message={dataError instanceof Error ? dataError.message : 'データの取得に失敗しました'} />
            )}

            {!isLoadingData && !dataError && (
              <Tabs index={tabIndex} onChange={handleTabChange} variant="enclosed" colorScheme="brand" isLazy>
                {/* タブ見出しは会員/ゲストの2タブがある admin 文脈のみ表示する。
                    ゲスト専用（公開／ウィジェット）では単独タブになり冗長なため非表示。 */}
                {showMemberOption && (
                  <TabList>
                    <Tab>会員として予約</Tab>
                    <Tab>ゲストとして予約</Tab>
                  </TabList>
                )}

                <TabPanels>
                  {showMemberOption && (
                    <TabPanel px={0}>
                      <VStack spacing={6} align="stretch">
                {/* 予約種別 */}
                <FormControl isInvalid={!!errors.reservation_type}>
                  <FormLabel>予約種別 <RequiredMark /></FormLabel>
                  <Controller
                    name="reservation_type"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup {...field}>
                        <Stack direction="row" spacing={4}>
                          <Radio value="regular">本予約</Radio>
                          <Radio value="tentative">仮予約</Radio>
                          <Radio value="location_scout">ロケハン</Radio>
                          <Radio value="second_keep">第2キープ</Radio>
                        </Stack>
                      </RadioGroup>
                    )}
                  />
                  <FormErrorMessage>{errors.reservation_type?.message}</FormErrorMessage>
                </FormControl>

                {/* プラン選択 */}
                <FormControl isInvalid={!!errors.plan_id}>
                  <FormLabel>プラン <RequiredMark /></FormLabel>
                  <Controller
                    name="plan_id"
                    control={control}
                    render={({ field }) => (
                      <Select placeholder="プランを選択" {...field}>
                        {plans.map((plan) => (
                          <option key={plan.plan_id} value={plan.plan_id}>
                            {plan.plan_name} - ¥{plan.price.toLocaleString()}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  <FormErrorMessage>{errors.plan_id?.message}</FormErrorMessage>
                </FormControl>

                {/* オプション選択 */}
                {options.length > 0 && (
                  <FormControl>
                    <FormLabel>オプション（任意）</FormLabel>
                    <Controller
                      name="options"
                      control={control}
                      render={({ field }) => (
                        <CheckboxGroup value={field.value} onChange={field.onChange}>
                          <Stack spacing={2}>
                            {options.map((option) => (
                              <Checkbox key={option.option_id} value={option.option_id}>
                                {option.option_name} - ¥{option.price.toLocaleString()}
                              </Checkbox>
                            ))}
                          </Stack>
                        </CheckboxGroup>
                      )}
                    />
                  </FormControl>
                )}

                <Divider />

                {/* 日付・時刻 */}
                <FormControl isInvalid={!!errors.date}>
                  <FormLabel>日付 <RequiredMark /></FormLabel>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <DatePickerField
                        value={field.value || ''}
                        onChange={field.onChange}
                        isInvalid={!!errors.date}
                      />
                    )}
                  />
                  <FormErrorMessage>{String(errors.date?.message || '')}</FormErrorMessage>
                </FormControl>

                <VStack spacing={4} align="stretch">
                  {blockedRangeMessages.length > 0 && (
                    <Alert status="warning" variant="left-accent" borderRadius="md" alignItems="flex-start">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" mb={1}>選択された日付に予約不可の時間帯があります</Text>
                        <VStack align="start" spacing={0}>
                          {blockedRangeMessages.map((msg, i) => (
                            <Text key={i} fontSize="sm">{msg}</Text>
                          ))}
                        </VStack>
                      </Box>
                    </Alert>
                  )}
                  <FormControl isInvalid={!!errors.start_time}>
                    <FormLabel>開始時刻 <RequiredMark /></FormLabel>
                    <TimePickerField
                      hour={startHour}
                      minute={startMinute}
                      onHourChange={setStartHour}
                      onMinuteChange={setStartMinute}
                      hourOptions={startHourOptions}
                      minuteOptions={minuteOptions}
                      isHourDisabled={(hour) => isHourFullyBlocked(hour, blockedTimeRanges)}
                      isMinuteDisabled={(minute) =>
                        startHour !== null && isTimeSlotDisabled(startHour, minute, blockedTimeRanges)
                      }
                      isInvalid={!!errors.start_time}
                    />
                    <FormErrorMessage>{String(errors.start_time?.message || '')}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.end_time}>
                    <FormLabel>終了時刻 <RequiredMark /></FormLabel>
                    <TimePickerField
                      hour={endHour}
                      minute={endMinute}
                      onHourChange={setEndHour}
                      onMinuteChange={setEndMinute}
                      hourOptions={endHourOptions}
                      minuteOptions={minuteOptions}
                      isHourDisabled={(hour) =>
                        !isOvernightTime(hour) &&
                        minuteOptions.every((m) => isEndTimeSlotDisabled(hour, m, blockedTimeRanges))
                      }
                      isMinuteDisabled={(minute) =>
                        endHour !== null &&
                        !isOvernightTime(endHour) &&
                        isEndTimeSlotDisabled(endHour, minute, blockedTimeRanges)
                      }
                      overnightPrefix={(hour) => (isOvernightTime(hour) ? '翌 ' : '')}
                      isInvalid={!!errors.end_time}
                    />
                    <FormErrorMessage>{String(errors.end_time?.message || '')}</FormErrorMessage>
                  </FormControl>
                </VStack>

                {/* 撮影種別 */}
                <FormControl isInvalid={!!errors.shooting_type}>
                  <FormLabel>撮影種別 <RequiredMark /></FormLabel>
                  <Controller
                    name="shooting_type"
                    control={control}
                    render={({ field }) => (
                      <CheckboxGroup value={field.value} onChange={field.onChange}>
                        <Stack direction="column" spacing={2}>
                          <Checkbox value="stills">スチール撮影</Checkbox>
                          <Checkbox value="video">ムービー撮影</Checkbox>
                          <Checkbox value="music_with_restrictions">楽器の演奏を伴う撮影(制限あり)</Checkbox>
                        </Stack>
                      </CheckboxGroup>
                    )}
                  />
                  <FormErrorMessage>{String(errors.shooting_type?.message || '')}</FormErrorMessage>
                </FormControl>

                {/* 撮影詳細 */}
                <FormControl isInvalid={!!errors.shooting_details}>
                  <FormLabel>撮影詳細 <RequiredMark /></FormLabel>
                  <Controller
                    name="shooting_details"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="撮影内容を詳しく記入してください"
                      />
                    )}
                  />
                  <FormErrorMessage>{String(errors.shooting_details?.message || '')}</FormErrorMessage>
                </FormControl>

                {/* カメラマン名 */}
                <FormControl isInvalid={!!errors.photographer_name}>
                  <FormLabel>カメラマン名 <RequiredMark /></FormLabel>
                  <Controller
                    name="photographer_name"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="山田太郎" />
                    )}
                  />
                  <FormErrorMessage>{String(errors.photographer_name?.message || '')}</FormErrorMessage>
                </FormControl>

                {/* 参加人数 */}
                <FormControl isInvalid={!!errors.number_of_people}>
                  <FormLabel>参加人数 <RequiredMark /></FormLabel>
                  <Controller
                    name="number_of_people"
                    control={control}
                    render={({ field: { value, onChange, onBlur, ref } }) => (
                      <NumberInput
                        min={1}
                        max={100}
                        value={value ?? 1}
                        onChange={(_, valueAsNumber) =>
                          onChange(Number.isNaN(valueAsNumber) ? undefined : valueAsNumber)
                        }
                      >
                        <NumberInputField ref={ref} onBlur={onBlur} />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  />
                  <FormErrorMessage>{String(errors.number_of_people?.message || '')}</FormErrorMessage>
                </FormControl>

                {/* 保険・保護 */}
                <VStack align="stretch" spacing={2}>
                  <Controller
                    name="needs_protection"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox isChecked={value} onChange={onChange}>
                        ホリゾントの養生あり
                      </Checkbox>
                    )}
                  />
                  <Controller
                    name="equipment_insurance"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox isChecked={value} onChange={onChange}>
                        機材保険を付帯する
                      </Checkbox>
                    )}
                  />
                </VStack>

                {/* 備考 */}
                <FormControl isInvalid={!!errors.note}>
                  <FormLabel>備考（任意）</FormLabel>
                  <Textarea
                    placeholder="その他ご要望があれば記入してください"
                    {...register('note')}
                  />
                  <FormErrorMessage>{String(errors.note?.message || '')}</FormErrorMessage>
                </FormControl>

                <Divider />

                {/* 前後1時間制約の説明 */}
                {(selectedReservationType === 'regular' || selectedReservationType === 'tentative') && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      既存予約（本予約・仮予約）の前後1時間は、本予約・仮予約を作成できません。
                      第2キープまたはロケハンをご利用ください。
                    </Text>
                  </Alert>
                )}

                {/* 料金表示 */}
                <Box bg="gray.50" p={4} borderRadius="md">
                  <VStack align="stretch" spacing={2}>
                    {priceInfo.hours > 0 && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">利用時間</Text>
                        <Text fontSize="sm" fontWeight="medium">{priceInfo.hours}時間</Text>
                      </HStack>
                    )}
                    {priceInfo.insuranceTotal > 0 && (
                      <HStack justify="space-between">
                        <Text>機材保険</Text>
                        <Text fontWeight="medium">¥{priceInfo.insuranceTotal.toLocaleString()}</Text>
                      </HStack>
                    )}
                    <HStack justify="space-between">
                      <Text>小計</Text>
                      <Text fontWeight="medium">¥{priceInfo.subtotal.toLocaleString()}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>消費税</Text>
                      <Text fontWeight="medium">¥{priceInfo.tax.toLocaleString()}</Text>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text fontSize="lg" fontWeight="bold">
                        合計
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="brand.600">
                        ¥{priceInfo.total.toLocaleString()}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>

                        <Alert status="info" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">
                            予約は管理者の承認後に確定されます。承認状況はマイページから確認できます。
                          </Text>
                        </Alert>
                      </VStack>
                    </TabPanel>
                  )}

                  {/* ゲスト予約タブ */}
                  <TabPanel px={0}>
                    <VStack spacing={6} align="stretch">
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <VStack align="flex-start" spacing={1} flex={1}>
                          <Text fontSize="sm" fontWeight="semibold">
                            {showMemberOption ? 'ゲストとして予約する場合' : 'ご予約について'}
                          </Text>
                          <Text fontSize="xs">
                            予約確認用のリンクをメールで送信します。予約の確認・キャンセルはメールに記載されたリンクから行えます。
                          </Text>
                        </VStack>
                      </Alert>

                      <Divider />

                      {/* ゲスト連絡先情報 */}
                      <Box>
                        <Text fontSize="md" fontWeight="semibold" mb={4}>
                          連絡先情報
                        </Text>

                        <VStack spacing={4}>
                          <FormControl isInvalid={!!errors.guest_name}>
                            <FormLabel>お名前 <RequiredMark /></FormLabel>
                            <Input placeholder="山田太郎" {...register('guest_name')} />
                            <FormErrorMessage>{String(errors.guest_name?.message || '')}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_email}>
                            <FormLabel>メールアドレス <RequiredMark /></FormLabel>
                            <Input type="email" placeholder="guest@example.com" {...register('guest_email')} />
                            <FormErrorMessage>{String(errors.guest_email?.message || '')}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_phone}>
                            <FormLabel>電話番号 <RequiredMark /></FormLabel>
                            <Input placeholder="090-1234-5678" {...register('guest_phone')} />
                            <FormErrorMessage>{String(errors.guest_phone?.message || '')}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_company}>
                            <FormLabel>会社名（任意）</FormLabel>
                            <Input placeholder="株式会社サンプル" {...register('guest_company')} />
                            <FormErrorMessage>{String(errors.guest_company?.message || '')}</FormErrorMessage>
                          </FormControl>
                        </VStack>
                      </Box>

                      <Divider />

                      {/* 既存の予約フォームフィールドをコピー（予約種別から料金表示まで） */}
                      {/* 予約種別 */}
                      <FormControl isInvalid={!!errors.reservation_type}>
                        <FormLabel>予約種別 <RequiredMark /></FormLabel>
                        <Controller
                          name="reservation_type"
                          control={control}
                          render={({ field }) => (
                            <RadioGroup {...field}>
                              <Stack direction="row" spacing={4}>
                                <Radio value="regular">本予約</Radio>
                                <Radio value="tentative">仮予約</Radio>
                                <Radio value="location_scout">ロケハン</Radio>
                                <Radio value="second_keep">第2キープ</Radio>
                              </Stack>
                            </RadioGroup>
                          )}
                        />
                        <FormErrorMessage>{String(errors.reservation_type?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* プラン選択 */}
                      <FormControl isInvalid={!!errors.plan_id}>
                        <FormLabel>プラン <RequiredMark /></FormLabel>
                        <Controller
                          name="plan_id"
                          control={control}
                          render={({ field }) => (
                            <Select placeholder="プランを選択" {...field}>
                              {plans.map((plan) => (
                                <option key={plan.plan_id} value={plan.plan_id}>
                                  {plan.plan_name} - ¥{plan.price.toLocaleString()}
                                </option>
                              ))}
                            </Select>
                          )}
                        />
                        <FormErrorMessage>{String(errors.plan_id?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* オプション選択 */}
                      {options.length > 0 && (
                        <FormControl>
                          <FormLabel>オプション（任意）</FormLabel>
                          <Controller
                            name="options"
                            control={control}
                            render={({ field }) => (
                              <CheckboxGroup value={field.value} onChange={field.onChange}>
                                <Stack spacing={2}>
                                  {options.map((option) => (
                                    <Checkbox key={option.option_id} value={option.option_id}>
                                      {option.option_name} - ¥{option.price.toLocaleString()}
                                    </Checkbox>
                                  ))}
                                </Stack>
                              </CheckboxGroup>
                            )}
                          />
                        </FormControl>
                      )}

                      <Divider />

                      {/* 日付・時刻 */}
                      <FormControl isInvalid={!!errors.date}>
                        <FormLabel>日付 <RequiredMark /></FormLabel>
                        <Controller
                          name="date"
                          control={control}
                          render={({ field }) => (
                            <DatePickerField
                              value={field.value || ''}
                              onChange={field.onChange}
                              isInvalid={!!errors.date}
                            />
                          )}
                        />
                        <FormErrorMessage>{String(errors.date?.message || '')}</FormErrorMessage>
                      </FormControl>

                      <VStack spacing={4} align="stretch">
                        {blockedRangeMessages.length > 0 && (
                          <Alert status="warning" variant="left-accent" borderRadius="md" alignItems="flex-start">
                            <AlertIcon />
                            <Box>
                              <Text fontWeight="bold" mb={1}>選択された日付に予約不可の時間帯があります</Text>
                              <VStack align="start" spacing={0}>
                                {blockedRangeMessages.map((msg, i) => (
                                  <Text key={i} fontSize="sm">{msg}</Text>
                                ))}
                              </VStack>
                            </Box>
                          </Alert>
                        )}
                        <FormControl isInvalid={!!errors.start_time}>
                          <FormLabel>開始時刻 <RequiredMark /></FormLabel>
                          <TimePickerField
                            hour={startHour}
                            minute={startMinute}
                            onHourChange={setStartHour}
                            onMinuteChange={setStartMinute}
                            hourOptions={startHourOptions}
                            minuteOptions={minuteOptions}
                            isHourDisabled={(hour) => isHourFullyBlocked(hour, blockedTimeRanges)}
                            isMinuteDisabled={(minute) =>
                              startHour !== null && isTimeSlotDisabled(startHour, minute, blockedTimeRanges)
                            }
                            isInvalid={!!errors.start_time}
                          />
                          <FormErrorMessage>{String(errors.start_time?.message || '')}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.end_time}>
                          <FormLabel>終了時刻 <RequiredMark /></FormLabel>
                          <TimePickerField
                            hour={endHour}
                            minute={endMinute}
                            onHourChange={setEndHour}
                            onMinuteChange={setEndMinute}
                            hourOptions={endHourOptions}
                            minuteOptions={minuteOptions}
                            isHourDisabled={(hour) =>
                              !isOvernightTime(hour) &&
                              minuteOptions.every((m) => isEndTimeSlotDisabled(hour, m, blockedTimeRanges))
                            }
                            isMinuteDisabled={(minute) =>
                              endHour !== null &&
                              !isOvernightTime(endHour) &&
                              isEndTimeSlotDisabled(endHour, minute, blockedTimeRanges)
                            }
                            overnightPrefix={(hour) => (isOvernightTime(hour) ? '翌 ' : '')}
                            isInvalid={!!errors.end_time}
                          />
                          <FormErrorMessage>{String(errors.end_time?.message || '')}</FormErrorMessage>
                        </FormControl>
                      </VStack>

                      {/* 撮影種別 */}
                      <FormControl isInvalid={!!errors.shooting_type}>
                        <FormLabel>撮影種別 <RequiredMark /></FormLabel>
                        <Controller
                          name="shooting_type"
                          control={control}
                          render={({ field }) => (
                            <CheckboxGroup value={field.value} onChange={field.onChange}>
                              <Stack direction="column" spacing={2}>
                                <Checkbox value="stills">スチール撮影</Checkbox>
                                <Checkbox value="video">ムービー撮影</Checkbox>
                                <Checkbox value="music_with_restrictions">楽器の演奏を伴う撮影(制限あり)</Checkbox>
                              </Stack>
                            </CheckboxGroup>
                          )}
                        />
                        <FormErrorMessage>{String(errors.shooting_type?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* 撮影詳細 */}
                      <FormControl isInvalid={!!errors.shooting_details}>
                        <FormLabel>撮影詳細 <RequiredMark /></FormLabel>
                        <Controller
                          name="shooting_details"
                          control={control}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              placeholder="撮影内容を詳しく記入してください"
                            />
                          )}
                        />
                        <FormErrorMessage>{String(errors.shooting_details?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* カメラマン名 */}
                      <FormControl isInvalid={!!errors.photographer_name}>
                        <FormLabel>カメラマン名 <RequiredMark /></FormLabel>
                        <Controller
                          name="photographer_name"
                          control={control}
                          render={({ field }) => (
                            <Input {...field} placeholder="山田太郎" />
                          )}
                        />
                        <FormErrorMessage>{String(errors.photographer_name?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* 参加人数 */}
                      <FormControl isInvalid={!!errors.number_of_people}>
                        <FormLabel>参加人数 <RequiredMark /></FormLabel>
                        <Controller
                          name="number_of_people"
                          control={control}
                          render={({ field: { value, onChange, onBlur, ref } }) => (
                            <NumberInput
                              min={1}
                              max={100}
                              value={value ?? 1}
                              onChange={(_, valueAsNumber) =>
                                onChange(Number.isNaN(valueAsNumber) ? undefined : valueAsNumber)
                              }
                            >
                              <NumberInputField ref={ref} onBlur={onBlur} />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          )}
                        />
                        <FormErrorMessage>{String(errors.number_of_people?.message || '')}</FormErrorMessage>
                      </FormControl>

                      {/* 保険・保護 */}
                      <VStack align="stretch" spacing={2}>
                        <Controller
                          name="needs_protection"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Checkbox isChecked={value} onChange={onChange}>
                              ホリゾントの養生あり
                            </Checkbox>
                          )}
                        />
                        <Controller
                          name="equipment_insurance"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Checkbox isChecked={value} onChange={onChange}>
                              機材保険を付帯する
                            </Checkbox>
                          )}
                        />
                      </VStack>

                      {/* 備考 */}
                      <FormControl isInvalid={!!errors.note}>
                        <FormLabel>備考（任意）</FormLabel>
                        <Textarea
                          placeholder="その他ご要望があれば記入してください"
                          {...register('note')}
                        />
                        <FormErrorMessage>{String(errors.note?.message || '')}</FormErrorMessage>
                      </FormControl>

                      <Divider />

                      {/* 前後1時間制約の説明 */}
                      {(selectedReservationType === 'regular' || selectedReservationType === 'tentative') && (
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">
                            既存予約（本予約・仮予約）の前後1時間は、本予約・仮予約を作成できません。
                            第2キープまたはロケハンをご利用ください。
                          </Text>
                        </Alert>
                      )}

                      {/* 料金表示 */}
                      <Box bg="gray.50" p={4} borderRadius="md">
                        <VStack align="stretch" spacing={2}>
                          {priceInfo.hours > 0 && (
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.600">利用時間</Text>
                              <Text fontSize="sm" fontWeight="medium">{priceInfo.hours}時間</Text>
                            </HStack>
                          )}
                          {priceInfo.insuranceTotal > 0 && (
                            <HStack justify="space-between">
                              <Text>機材保険</Text>
                              <Text fontWeight="medium">¥{priceInfo.insuranceTotal.toLocaleString()}</Text>
                            </HStack>
                          )}
                          <HStack justify="space-between">
                            <Text>小計</Text>
                            <Text fontWeight="medium">¥{priceInfo.subtotal.toLocaleString()}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>消費税</Text>
                            <Text fontWeight="medium">¥{priceInfo.tax.toLocaleString()}</Text>
                          </HStack>
                          <Divider />
                          <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="bold">
                              合計
                            </Text>
                            <Text fontSize="lg" fontWeight="bold" color="brand.600">
                              ¥{priceInfo.total.toLocaleString()}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>

                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <Text fontSize="sm">
                          予約完了後、確認メールが送信されます。メールに記載されたリンクから予約の確認・キャンセルが可能です。
                        </Text>
                      </Alert>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={(createMutation.isPending || createGuestMutation.isPending)}>
            キャンセル
          </Button>
          <Button
            colorScheme="brand"
            type="submit"
            isLoading={(createMutation.isPending || createGuestMutation.isPending)}
            loadingText="作成中..."
          >
            予約を作成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* 第2キープ切替の確認ダイアログ（SECOND_KEEP_ONLY を受けたとき表示） */}
    <AlertDialog
      isOpen={secondKeepConfirmOpen}
      leastDestructiveRef={cancelSecondKeepRef}
      onClose={() => setSecondKeepConfirmOpen(false)}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            第2キープで予約しますか？
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text fontSize="sm">
              ご指定の時間帯は既存の仮予約と近接しているため、第2キープ（仮押さえ）でのみ予約できます。
              第1候補がキャンセルされた場合に繰り上げ対象となります。
              第2キープで予約しますか？
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelSecondKeepRef}
              variant="ghost"
              onClick={() => setSecondKeepConfirmOpen(false)}
            >
              やめる
            </Button>
            <Button
              colorScheme="brand"
              ml={3}
              onClick={handleConfirmSecondKeep}
              isLoading={createMutation.isPending || createGuestMutation.isPending}
              loadingText="作成中..."
            >
              第2キープで予約する
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
    </>
  );
}
