import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
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
import { useCreateReservation } from '../../hooks/useReservations';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { useAuthStore } from '../../stores/authStore';
import type { CreateReservationRequest } from '../../types';

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
  shooting_type: z.array(z.string()).min(1, '撮影種別を選択してください'),
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
const createReservationSchema = z.union([memberReservationSchema, guestReservationSchema]);

// type CreateReservationFormData = z.infer<typeof createReservationSchema>;

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
}

export default function CreateReservationModal({
  isOpen,
  onClose,
  studioId,
  initialDate,
  initialStartTime,
  onSuccess,
  reservations = [],
}: CreateReservationModalProps) {
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const [tabIndex, setTabIndex] = useState(0); // 0: 会員, 1: ゲスト
  // const [guestToken, setGuestToken] = useState<string | null>(null);

  // React Queryでプラン・オプション取得
  const { data: plans = [], isLoading: isLoadingPlans, error: plansError } = usePlans(studioId);
  const { data: options = [], isLoading: isLoadingOptions, error: optionsError } = useOptions(studioId);

  // デバッグ用ログ
  useEffect(() => {
    console.log('Plans loaded:', plans);
    console.log('Options loaded:', options);
  }, [plans, options]);

  // React Queryで予約作成
  const createMutation = useCreateReservation();

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
  } = useForm<any>({
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
      needs_protection: false,
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

  // モーダルが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      // タブを会員タブにリセット（ログインしている場合）
      setTabIndex(isAuthenticated ? 0 : 0);
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
  }, [isOpen, isAuthenticated, initialDate, initialStartTime, setValue]);

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

  // 料金計算（プラン料金×利用時間＋オプション料金）
  const calculateTotalPrice = () => {
    const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);
    if (!selectedPlan) return { subtotal: 0, tax: 0, total: 0, hours: 0 };

    const usageHours = calculateUsageHours();

    // プラン料金 = 時間単価 × 利用時間
    const planPrice = selectedPlan.price * usageHours;
    const planTax = Math.floor(planPrice * selectedPlan.tax_rate);

    // オプション料金（時間によらず固定）
    const selectedOptions = options.filter((o) => selectedOptionIds.includes(o.option_id));
    const optionsPrice = selectedOptions.reduce((sum, o) => sum + o.price, 0);
    const optionsTax = selectedOptions.reduce((sum, o) => Math.floor(o.price * o.tax_rate), 0);

    const subtotal = planPrice + optionsPrice;
    const tax = planTax + optionsTax;
    const total = subtotal + tax;

    return { subtotal, tax, total, hours: usageHours };
  };

  const priceInfo = calculateTotalPrice();

  // 前後1時間の制約をチェックする関数（15分単位で細かく制御）
  const getBlockedTimeRanges = (date: string, reservationType: string) => {
    // 第2キープとロケハンは前後1時間の制約を受けない
    if (reservationType === 'second_keep' || reservationType === 'location_scout') {
      return [];
    }

    // 選択された日付の予約を取得
    const dateReservations = reservations.filter(
      (r) => r.date === date && (r.status === 'confirmed' || r.status === 'tentative')
    );

    const blockedRanges: Array<{ startMin: number; endMin: number }> = [];

    for (const reservation of dateReservations) {
      const [startHourStr, startMinStr] = reservation.start_time.split(':');
      const [endHourStr, endMinStr] = reservation.end_time.split(':');

      const startMin = parseInt(startHourStr) * 60 + parseInt(startMinStr);
      const endMin = parseInt(endHourStr) * 60 + parseInt(endMinStr);

      // 前1時間（60分）と後1時間（60分）をブロック
      blockedRanges.push({
        startMin: Math.max(0, startMin - 60),
        endMin: Math.min(24 * 60, endMin + 60),
      });
    }

    return blockedRanges;
  };

  // 時刻（時＋分）が無効かどうかをチェック
  const isTimeSlotDisabled = (hour: number, minute: number, blockedRanges: Array<{ startMin: number; endMin: number }>) => {
    const totalMin = hour * 60 + minute;

    return blockedRanges.some((range) => {
      // 時刻がブロック範囲内にあるかチェック
      return totalMin >= range.startMin && totalMin < range.endMin;
    });
  };

  // 現在の予約種別と日付に基づいてブロックされた時間帯を取得
  const blockedTimeRanges = getBlockedTimeRanges(selectedDate || '', selectedReservationType);

  // タブ変更時の処理
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    setValue('is_guest', index === 1);
  };

  // フォーム送信
  const onSubmit = async (data: any) => {
    // デバッグ: 送信データを確認
    console.log('Form submit data:', data);
    console.log('Tab index:', tabIndex);

    // バリデーション
    const isGuest = tabIndex === 1;
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
      shooting_type: validatedData.shooting_type as any,
    };

    createMutation.mutate(reservationData, {
      onSuccess: (result) => {
        // ゲスト予約の場合、トークンを保存
        if (isGuest && result.guest_token) {
          // setGuestToken(result.guest_token);

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

        reset();
        onClose();
        onSuccess?.();
      },
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : '予約の作成に失敗しました';
        toast({
          title: 'エラー',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  // モーダルを閉じる
  const handleClose = () => {
    reset();
    setTabIndex(0); // タブをリセット
    // setGuestToken(null); // ゲストトークンをリセット
    onClose();
  };

  // 時間選択肢（0〜23時、分は00/15/30/45）
  const startHourOptions = Array.from({ length: 24 }, (_, i) => i); // 0-23
  const endHourOptions = Array.from({ length: 25 }, (_, i) => i); // 0-24
  const minuteOptions = [0, 15, 30, 45];

  // 時と分を分けて管理するためのstate
  const [startHour, setStartHour] = useState<number | null>(null);
  const [startMinute, setStartMinute] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [endMinute, setEndMinute] = useState<number | null>(null);

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
  }, [startHour, startMinute, endHour, endMinute, setValue]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" id="create-reservation-form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>新規予約作成</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
            {isLoadingData && <LoadingSpinner />}

            {dataError && !isLoadingData && (
              <ErrorMessage message={dataError instanceof Error ? dataError.message : 'データの取得に失敗しました'} />
            )}

            {!isLoadingData && !dataError && (
              <Tabs index={tabIndex} onChange={handleTabChange} variant="enclosed" colorScheme="brand">
                <TabList>
                  {isAuthenticated && <Tab>会員として予約</Tab>}
                  <Tab>ゲストとして予約</Tab>
                </TabList>

                <TabPanels>
                  {isAuthenticated && (
                    <TabPanel px={0}>
                      <VStack spacing={6} align="stretch">
                {/* 予約種別 */}
                <FormControl isInvalid={!!errors.reservation_type}>
                  <FormLabel>予約種別</FormLabel>
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
                  <FormLabel>プラン</FormLabel>
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
                  <FormLabel>日付</FormLabel>
                  <Input type="date" {...register('date')} />
                  <FormErrorMessage>{String(errors.date?.message || '')}</FormErrorMessage>
                </FormControl>

                <VStack spacing={4} align="stretch">
                  <FormControl isInvalid={!!errors.start_time}>
                    <FormLabel>開始時刻</FormLabel>
                    <HStack>
                      <Select
                        placeholder="時"
                        value={startHour ?? ''}
                        onChange={(e) => setStartHour(e.target.value ? parseInt(e.target.value) : null)}
                        flex={1}
                      >
                        {startHourOptions.map((hour) => (
                          <option key={hour} value={hour}>
                            {String(hour).padStart(2, '0')}時
                          </option>
                        ))}
                      </Select>
                      <Select
                        placeholder="分"
                        value={startMinute ?? ''}
                        onChange={(e) => setStartMinute(e.target.value ? parseInt(e.target.value) : null)}
                        flex={1}
                      >
                        {minuteOptions.map((minute) => {
                          const disabled = startHour !== null && isTimeSlotDisabled(startHour, minute, blockedTimeRanges);
                          return (
                            <option key={minute} value={minute} disabled={disabled}>
                              {String(minute).padStart(2, '0')}分{disabled && ' (予約不可)'}
                            </option>
                          );
                        })}
                      </Select>
                    </HStack>
                    <FormErrorMessage>{String(errors.start_time?.message || '')}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.end_time}>
                    <FormLabel>終了時刻</FormLabel>
                    <HStack>
                      <Select
                        placeholder="時"
                        value={endHour ?? ''}
                        onChange={(e) => setEndHour(e.target.value ? parseInt(e.target.value) : null)}
                        flex={1}
                      >
                        {endHourOptions.map((hour) => {
                          const isOvernight = isOvernightTime(hour);
                          return (
                            <option key={hour} value={hour}>
                              {isOvernight && '翌 '}
                              {String(hour).padStart(2, '0')}時
                            </option>
                          );
                        })}
                      </Select>
                      <Select
                        placeholder="分"
                        value={endMinute ?? ''}
                        onChange={(e) => setEndMinute(e.target.value ? parseInt(e.target.value) : null)}
                        flex={1}
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute}>
                            {String(minute).padStart(2, '0')}分
                          </option>
                        ))}
                      </Select>
                    </HStack>
                    <FormErrorMessage>{String(errors.end_time?.message || '')}</FormErrorMessage>
                  </FormControl>
                </VStack>

                {/* 撮影種別 */}
                <FormControl isInvalid={!!errors.shooting_type}>
                  <FormLabel>撮影種別</FormLabel>
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
                  <FormLabel>撮影詳細</FormLabel>
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
                  <FormLabel>カメラマン名</FormLabel>
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
                  <FormLabel>参加人数</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    {...register('number_of_people', { valueAsNumber: true })}
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
                        機材保険に加入している
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
                            ゲストとして予約する場合
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
                            <FormLabel>お名前 *</FormLabel>
                            <Input placeholder="山田太郎" {...register('guest_name')} />
                            <FormErrorMessage>{String(errors.guest_name?.message || '')}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_email}>
                            <FormLabel>メールアドレス *</FormLabel>
                            <Input type="email" placeholder="guest@example.com" {...register('guest_email')} />
                            <FormErrorMessage>{String(errors.guest_email?.message || '')}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_phone}>
                            <FormLabel>電話番号 *</FormLabel>
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
                        <FormLabel>予約種別</FormLabel>
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
                        <FormLabel>プラン</FormLabel>
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
                        <FormLabel>日付</FormLabel>
                        <Input type="date" {...register('date')} />
                        <FormErrorMessage>{String(errors.date?.message || '')}</FormErrorMessage>
                      </FormControl>

                      <VStack spacing={4} align="stretch">
                        <FormControl isInvalid={!!errors.start_time}>
                          <FormLabel>開始時刻</FormLabel>
                          <HStack>
                            <Select
                              placeholder="時"
                              value={startHour ?? ''}
                              onChange={(e) => setStartHour(e.target.value ? parseInt(e.target.value) : null)}
                              flex={1}
                            >
                              {startHourOptions.map((hour) => (
                                <option key={hour} value={hour}>
                                  {String(hour).padStart(2, '0')}時
                                </option>
                              ))}
                            </Select>
                            <Select
                              placeholder="分"
                              value={startMinute ?? ''}
                              onChange={(e) => setStartMinute(e.target.value ? parseInt(e.target.value) : null)}
                              flex={1}
                            >
                              {minuteOptions.map((minute) => {
                                const disabled = startHour !== null && isTimeSlotDisabled(startHour, minute, blockedTimeRanges);
                                return (
                                  <option key={minute} value={minute} disabled={disabled}>
                                    {String(minute).padStart(2, '0')}分{disabled && ' (予約不可)'}
                                  </option>
                                );
                              })}
                            </Select>
                          </HStack>
                          <FormErrorMessage>{String(errors.start_time?.message || '')}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.end_time}>
                          <FormLabel>終了時刻</FormLabel>
                          <HStack>
                            <Select
                              placeholder="時"
                              value={endHour ?? ''}
                              onChange={(e) => setEndHour(e.target.value ? parseInt(e.target.value) : null)}
                              flex={1}
                            >
                              {endHourOptions.map((hour) => {
                                const isOvernight = isOvernightTime(hour);
                                return (
                                  <option key={hour} value={hour}>
                                    {isOvernight && '翌 '}
                                    {String(hour).padStart(2, '0')}時
                                  </option>
                                );
                              })}
                            </Select>
                            <Select
                              placeholder="分"
                              value={endMinute ?? ''}
                              onChange={(e) => setEndMinute(e.target.value ? parseInt(e.target.value) : null)}
                              flex={1}
                            >
                              {minuteOptions.map((minute) => (
                                <option key={minute} value={minute}>
                                  {String(minute).padStart(2, '0')}分
                                </option>
                              ))}
                            </Select>
                          </HStack>
                          <FormErrorMessage>{String(errors.end_time?.message || '')}</FormErrorMessage>
                        </FormControl>
                      </VStack>

                      {/* 撮影種別 */}
                      <FormControl isInvalid={!!errors.shooting_type}>
                        <FormLabel>撮影種別</FormLabel>
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
                        <FormLabel>撮影詳細</FormLabel>
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
                        <FormLabel>カメラマン名</FormLabel>
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
                        <FormLabel>参加人数</FormLabel>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...register('number_of_people', { valueAsNumber: true })}
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
                              機材保険に加入している
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
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={createMutation.isPending}>
            キャンセル
          </Button>
          <Button
            colorScheme="brand"
            type="submit"
            isLoading={createMutation.isPending}
            loadingText="作成中..."
          >
            予約を作成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
