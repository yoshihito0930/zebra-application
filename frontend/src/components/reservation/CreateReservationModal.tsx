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
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mockGetPlans, mockGetOptions } from '../../services/planService';
import { mockCreateReservation } from '../../services/reservationService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { useAuthStore } from '../../stores/authStore';
import type { Plan, Option, CreateReservationRequest } from '../../types';

// 会員予約バリデーションスキーマ
const memberReservationSchema = z.object({
  studio_id: z.string().min(1, 'スタジオIDが必要です'),
  reservation_type: z.enum(['regular', 'tentative', 'location_scout', 'second_keep'], {
    errorMap: () => ({ message: '予約種別を選択してください' }),
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

type CreateReservationFormData = z.infer<typeof createReservationSchema>;

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  initialDate?: string;
  onSuccess?: () => void;
}

export default function CreateReservationModal({
  isOpen,
  onClose,
  studioId,
  initialDate,
  onSuccess,
}: CreateReservationModalProps) {
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); // 0: 会員, 1: ゲスト
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      studio_id: studioId,
      reservation_type: 'regular',
      date: initialDate || '',
      shooting_type: [],
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

  // プラン・オプション取得
  useEffect(() => {
    if (isOpen) {
      fetchPlansAndOptions();
    }
  }, [isOpen, studioId]);

  const fetchPlansAndOptions = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [plansData, optionsData] = await Promise.all([
        mockGetPlans(studioId),
        mockGetOptions(studioId),
      ]);
      setPlans(plansData);
      setOptions(optionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setDataError(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  };

  // 選択中のプラン・オプション
  const selectedPlanId = watch('plan_id');
  const selectedOptionIds = watch('options') || [];

  // 料金計算
  const calculateTotalPrice = () => {
    const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);
    if (!selectedPlan) return { subtotal: 0, tax: 0, total: 0 };

    const planPrice = selectedPlan.price;
    const planTax = Math.floor(planPrice * selectedPlan.tax_rate);

    const selectedOptions = options.filter((o) => selectedOptionIds.includes(o.option_id));
    const optionsPrice = selectedOptions.reduce((sum, o) => sum + o.price, 0);
    const optionsTax = selectedOptions.reduce((sum, o) => Math.floor(o.price * o.tax_rate), 0);

    const subtotal = planPrice + optionsPrice;
    const tax = planTax + optionsTax;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const priceInfo = calculateTotalPrice();

  // タブ変更時の処理
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    setValue('is_guest', index === 1);
  };

  // フォーム送信
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // バリデーション
      const isGuest = tabIndex === 1;
      const schema = isGuest ? guestReservationSchema : memberReservationSchema;

      const validatedData = schema.parse({
        ...data,
        is_guest: isGuest,
      });

      const reservationData: CreateReservationRequest = {
        ...validatedData,
        options: validatedData.options || [],
      };

      const result = await mockCreateReservation(reservationData);

      // ゲスト予約の場合、トークンを保存
      if (isGuest && result.guest_token) {
        setGuestToken(result.guest_token);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約の作成に失敗しました';
      toast({
        title: 'エラー',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    reset();
    onClose();
  };

  // 時間選択肢（9:00〜21:00）
  const timeOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = 9 + i;
    return `${String(hour).padStart(2, '0')}:00`;
  });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新規予約作成</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoadingData && <LoadingSpinner />}

          {dataError && !isLoadingData && <ErrorMessage message={dataError} />}

          {!isLoadingData && !dataError && (
            <Tabs index={tabIndex} onChange={handleTabChange} variant="enclosed" colorScheme="brand">
              <TabList>
                {isAuthenticated && <Tab>会員として予約</Tab>}
                <Tab>ゲストとして予約</Tab>
              </TabList>

              <TabPanels>
                {isAuthenticated && (
                  <TabPanel px={0}>
                    <form id="create-reservation-form" onSubmit={handleSubmit(onSubmit)}>
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
                  <Select placeholder="プランを選択" {...register('plan_id')}>
                    {plans.map((plan) => (
                      <option key={plan.plan_id} value={plan.plan_id}>
                        {plan.plan_name} - ¥{plan.price.toLocaleString()}
                      </option>
                    ))}
                  </Select>
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
                <HStack spacing={4}>
                  <FormControl isInvalid={!!errors.date} flex={1}>
                    <FormLabel>日付</FormLabel>
                    <Input type="date" {...register('date')} />
                    <FormErrorMessage>{errors.date?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.start_time} flex={1}>
                    <FormLabel>開始時刻</FormLabel>
                    <Select placeholder="選択" {...register('start_time')}>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                    <FormErrorMessage>{errors.start_time?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.end_time} flex={1}>
                    <FormLabel>終了時刻</FormLabel>
                    <Select placeholder="選択" {...register('end_time')}>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                    <FormErrorMessage>{errors.end_time?.message}</FormErrorMessage>
                  </FormControl>
                </HStack>

                {/* 撮影種別 */}
                <FormControl isInvalid={!!errors.shooting_type}>
                  <FormLabel>撮影種別</FormLabel>
                  <Controller
                    name="shooting_type"
                    control={control}
                    render={({ field }) => (
                      <CheckboxGroup value={field.value} onChange={field.onChange}>
                        <Stack direction="row" spacing={4}>
                          <Checkbox value="stills">スチール</Checkbox>
                          <Checkbox value="video">動画</Checkbox>
                          <Checkbox value="workshop">ワークショップ</Checkbox>
                          <Checkbox value="other">その他</Checkbox>
                        </Stack>
                      </CheckboxGroup>
                    )}
                  />
                  <FormErrorMessage>{errors.shooting_type?.message}</FormErrorMessage>
                </FormControl>

                {/* 撮影詳細 */}
                <FormControl isInvalid={!!errors.shooting_details}>
                  <FormLabel>撮影詳細</FormLabel>
                  <Textarea
                    placeholder="撮影内容を詳しく記入してください"
                    {...register('shooting_details')}
                  />
                  <FormErrorMessage>{errors.shooting_details?.message}</FormErrorMessage>
                </FormControl>

                {/* カメラマン名 */}
                <FormControl isInvalid={!!errors.photographer_name}>
                  <FormLabel>カメラマン名</FormLabel>
                  <Input placeholder="山田太郎" {...register('photographer_name')} />
                  <FormErrorMessage>{errors.photographer_name?.message}</FormErrorMessage>
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
                  <FormErrorMessage>{errors.number_of_people?.message}</FormErrorMessage>
                </FormControl>

                {/* 保険・保護 */}
                <VStack align="stretch" spacing={2}>
                  <Controller
                    name="needs_protection"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox isChecked={value} onChange={onChange}>
                        壁・床の養生が必要
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
                  <FormErrorMessage>{errors.note?.message}</FormErrorMessage>
                </FormControl>

                <Divider />

                {/* 料金表示 */}
                <Box bg="gray.50" p={4} borderRadius="md">
                  <VStack align="stretch" spacing={2}>
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
                    </form>
                  </TabPanel>
                )}

                {/* ゲスト予約タブ */}
                <TabPanel px={0}>
                  <form id="create-reservation-form-guest" onSubmit={handleSubmit(onSubmit)}>
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
                            <FormErrorMessage>{errors.guest_name?.message as string}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_email}>
                            <FormLabel>メールアドレス *</FormLabel>
                            <Input type="email" placeholder="guest@example.com" {...register('guest_email')} />
                            <FormErrorMessage>{errors.guest_email?.message as string}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_phone}>
                            <FormLabel>電話番号 *</FormLabel>
                            <Input placeholder="090-1234-5678" {...register('guest_phone')} />
                            <FormErrorMessage>{errors.guest_phone?.message as string}</FormErrorMessage>
                          </FormControl>

                          <FormControl isInvalid={!!errors.guest_company}>
                            <FormLabel>会社名（任意）</FormLabel>
                            <Input placeholder="株式会社サンプル" {...register('guest_company')} />
                            <FormErrorMessage>{errors.guest_company?.message as string}</FormErrorMessage>
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
                        <FormErrorMessage>{errors.reservation_type?.message as string}</FormErrorMessage>
                      </FormControl>

                      {/* プラン選択 */}
                      <FormControl isInvalid={!!errors.plan_id}>
                        <FormLabel>プラン</FormLabel>
                        <Select placeholder="プランを選択" {...register('plan_id')}>
                          {plans.map((plan) => (
                            <option key={plan.plan_id} value={plan.plan_id}>
                              {plan.plan_name} - ¥{plan.price.toLocaleString()}
                            </option>
                          ))}
                        </Select>
                        <FormErrorMessage>{errors.plan_id?.message as string}</FormErrorMessage>
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
                      <HStack spacing={4}>
                        <FormControl isInvalid={!!errors.date} flex={1}>
                          <FormLabel>日付</FormLabel>
                          <Input type="date" {...register('date')} />
                          <FormErrorMessage>{errors.date?.message as string}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.start_time} flex={1}>
                          <FormLabel>開始時刻</FormLabel>
                          <Select placeholder="選択" {...register('start_time')}>
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </Select>
                          <FormErrorMessage>{errors.start_time?.message as string}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.end_time} flex={1}>
                          <FormLabel>終了時刻</FormLabel>
                          <Select placeholder="選択" {...register('end_time')}>
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </Select>
                          <FormErrorMessage>{errors.end_time?.message as string}</FormErrorMessage>
                        </FormControl>
                      </HStack>

                      {/* 撮影種別 */}
                      <FormControl isInvalid={!!errors.shooting_type}>
                        <FormLabel>撮影種別</FormLabel>
                        <Controller
                          name="shooting_type"
                          control={control}
                          render={({ field }) => (
                            <CheckboxGroup value={field.value} onChange={field.onChange}>
                              <Stack direction="row" spacing={4}>
                                <Checkbox value="stills">スチール</Checkbox>
                                <Checkbox value="video">動画</Checkbox>
                                <Checkbox value="workshop">ワークショップ</Checkbox>
                                <Checkbox value="other">その他</Checkbox>
                              </Stack>
                            </CheckboxGroup>
                          )}
                        />
                        <FormErrorMessage>{errors.shooting_type?.message as string}</FormErrorMessage>
                      </FormControl>

                      {/* 撮影詳細 */}
                      <FormControl isInvalid={!!errors.shooting_details}>
                        <FormLabel>撮影詳細</FormLabel>
                        <Textarea
                          placeholder="撮影内容を詳しく記入してください"
                          {...register('shooting_details')}
                        />
                        <FormErrorMessage>{errors.shooting_details?.message as string}</FormErrorMessage>
                      </FormControl>

                      {/* カメラマン名 */}
                      <FormControl isInvalid={!!errors.photographer_name}>
                        <FormLabel>カメラマン名</FormLabel>
                        <Input placeholder="山田太郎" {...register('photographer_name')} />
                        <FormErrorMessage>{errors.photographer_name?.message as string}</FormErrorMessage>
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
                        <FormErrorMessage>{errors.number_of_people?.message as string}</FormErrorMessage>
                      </FormControl>

                      {/* 保険・保護 */}
                      <VStack align="stretch" spacing={2}>
                        <Controller
                          name="needs_protection"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Checkbox isChecked={value} onChange={onChange}>
                              壁・床の養生が必要
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
                        <FormErrorMessage>{errors.note?.message as string}</FormErrorMessage>
                      </FormControl>

                      <Divider />

                      {/* 料金表示 */}
                      <Box bg="gray.50" p={4} borderRadius="md">
                        <VStack align="stretch" spacing={2}>
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
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            colorScheme="brand"
            type="submit"
            form={tabIndex === 1 || !isAuthenticated ? 'create-reservation-form-guest' : 'create-reservation-form'}
            isLoading={isSubmitting}
            loadingText="作成中..."
          >
            予約を作成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
