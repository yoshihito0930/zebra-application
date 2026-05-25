import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  InputGroup,
  InputRightAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
  Input,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  planSchema,
  type PlanFormData,
} from '../../../utils/validationSchemas';
import { useCreatePlan, useUpdatePlan } from '../../../hooks/usePlans';
import { getErrorMessage } from '../../../services/api';
import type { Plan, UpdatePlanRequest } from '../../../types';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  mode: 'create' | 'edit';
  plan?: Plan;
  nextDisplayOrder?: number;
}

const buildDefaults = (
  mode: 'create' | 'edit',
  plan: Plan | undefined,
  nextDisplayOrder: number
): PlanFormData => {
  if (mode === 'edit' && plan) {
    return {
      plan_name: plan.plan_name,
      description: plan.description ?? '',
      price: plan.price,
      tax_rate: plan.tax_rate,
      display_order: plan.display_order,
    };
  }
  return {
    plan_name: '',
    description: '',
    price: 0,
    tax_rate: 0.1,
    display_order: nextDisplayOrder,
  };
};

export default function PlanFormModal({
  isOpen,
  onClose,
  studioId,
  mode,
  plan,
  nextDisplayOrder = 1,
}: PlanFormModalProps) {
  const toast = useToast();
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const advanced = useDisclosure();

  const isEdit = mode === 'edit';
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: buildDefaults(mode, plan, nextDisplayOrder),
  });

  const descriptionValue = watch('description') ?? '';

  // モーダルを開くたびに初期値をリセット
  useEffect(() => {
    if (isOpen) {
      reset(buildDefaults(mode, plan, nextDisplayOrder));
      // 詳細セクションは常に閉じた状態で開く
      advanced.onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, plan, nextDisplayOrder]);

  const onSubmit = handleSubmit((data) => {
    const description = data.description?.trim();

    if (isEdit && plan) {
      // dirty なフィールドだけ PATCH
      const payload: UpdatePlanRequest = {};
      if (dirtyFields.plan_name) payload.plan_name = data.plan_name;
      if (dirtyFields.description) {
        payload.description = description || undefined;
      }
      if (dirtyFields.price) payload.price = data.price;
      if (dirtyFields.tax_rate) payload.tax_rate = data.tax_rate;
      if (dirtyFields.display_order) payload.display_order = data.display_order;

      if (Object.keys(payload).length === 0) {
        // 変更なし → そのまま閉じる
        onClose();
        return;
      }

      updateMutation.mutate(
        { planId: plan.plan_id, data: payload },
        {
          onSuccess: () => {
            toast({
              title: 'プランを保存しました',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            onClose();
          },
          onError: (error) => {
            toast({
              title: 'プランの保存に失敗しました',
              description: getErrorMessage(error),
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          },
        }
      );
      return;
    }

    // 新規作成
    createMutation.mutate(
      {
        studio_id: studioId,
        plan_name: data.plan_name,
        description: description || undefined,
        price: data.price,
        tax_rate: data.tax_rate,
        display_order: data.display_order,
      },
      {
        onSuccess: () => {
          toast({
            title: 'プランを追加しました',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          onClose();
        },
        onError: (error) => {
          toast({
            title: 'プランの追加に失敗しました',
            description: getErrorMessage(error),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'lg' }}
      closeOnOverlayClick={!isPending}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? 'プランを編集' : '新規プラン'}</ModalHeader>
        <ModalCloseButton isDisabled={isPending} />
        <form onSubmit={onSubmit}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.plan_name} isRequired>
                <FormLabel>プラン名</FormLabel>
                <Input
                  placeholder="例: スチール撮影プラン"
                  maxLength={100}
                  {...register('plan_name')}
                />
                <FormErrorMessage>{errors.plan_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.description}>
                <FormLabel>説明（任意）</FormLabel>
                <Textarea
                  placeholder="例: スチール撮影向けの基本プラン。基本機材を含みます。"
                  maxLength={500}
                  rows={3}
                  {...register('description')}
                />
                <HStack justify="space-between" mt={1}>
                  <FormErrorMessage mt={0}>
                    {errors.description?.message}
                  </FormErrorMessage>
                  <Text fontSize="xs" color="gray.500" ml="auto">
                    {descriptionValue.length} / 500
                  </Text>
                </HStack>
              </FormControl>

              <FormControl isInvalid={!!errors.price} isRequired>
                <FormLabel>料金（税抜）</FormLabel>
                <Controller
                  name="price"
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <InputGroup>
                      <NumberInput
                        min={0}
                        max={10_000_000}
                        step={500}
                        value={Number.isNaN(value) ? 0 : value}
                        onChange={(_, num) =>
                          onChange(Number.isNaN(num) ? 0 : num)
                        }
                        w="100%"
                      >
                        <NumberInputField ref={ref} onBlur={onBlur} />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <InputRightAddon>円</InputRightAddon>
                    </InputGroup>
                  )}
                />
                <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.display_order} isRequired>
                <FormLabel>表示順</FormLabel>
                <Controller
                  name="display_order"
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <NumberInput
                      min={0}
                      max={999}
                      value={Number.isNaN(value) ? 0 : value}
                      onChange={(_, num) =>
                        onChange(Number.isNaN(num) ? 0 : num)
                      }
                      w="160px"
                    >
                      <NumberInputField ref={ref} onBlur={onBlur} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormHelperText>
                  小さい数値ほど予約フォームの先頭に表示されます
                </FormHelperText>
                <FormErrorMessage>
                  {errors.display_order?.message}
                </FormErrorMessage>
              </FormControl>

              {/* 詳細設定（税率） */}
              <Box>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    advanced.isOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )
                  }
                  onClick={advanced.onToggle}
                  px={0}
                >
                  詳細設定
                </Button>
                <Collapse in={advanced.isOpen} animateOpacity>
                  <Box pt={3}>
                    <FormControl isInvalid={!!errors.tax_rate} isRequired>
                      <FormLabel>税率</FormLabel>
                      <Controller
                        name="tax_rate"
                        control={control}
                        render={({
                          field: { value, onChange, onBlur, ref },
                        }) => (
                          <NumberInput
                            min={0}
                            max={1}
                            step={0.01}
                            precision={2}
                            value={Number.isNaN(value) ? 0 : value}
                            onChange={(_, num) =>
                              onChange(Number.isNaN(num) ? 0 : num)
                            }
                            w="160px"
                          >
                            <NumberInputField ref={ref} onBlur={onBlur} />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <FormHelperText>
                        例: 0.10 = 10%（消費税）
                      </FormHelperText>
                      <FormErrorMessage>
                        {errors.tax_rate?.message}
                      </FormErrorMessage>
                    </FormControl>
                  </Box>
                </Collapse>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              isDisabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" colorScheme="brand" isLoading={isPending}>
              {isEdit ? '保存する' : '追加する'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
