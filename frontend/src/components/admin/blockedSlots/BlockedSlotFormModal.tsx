import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import {
  blockedSlotSchema,
  type BlockedSlotFormData,
} from '../../../utils/validationSchemas';
import { useCreateBlockedSlot } from '../../../hooks/useBlockedSlots';
import { getErrorMessage } from '../../../services/api';

interface BlockedSlotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
}

const todayYMD = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DEFAULT_VALUES: BlockedSlotFormData = {
  date: todayYMD(),
  is_all_day: true,
  start_time: '',
  end_time: '',
  reason: '',
};

export default function BlockedSlotFormModal({
  isOpen,
  onClose,
  studioId,
}: BlockedSlotFormModalProps) {
  const toast = useToast();
  const createMutation = useCreateBlockedSlot();
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<BlockedSlotFormData>({
    resolver: zodResolver(blockedSlotSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const isAllDay = watch('is_all_day');
  const reasonValue = watch('reason') ?? '';

  // モーダルを開くたびにフォームをリセット
  useEffect(() => {
    if (isOpen) {
      reset({ ...DEFAULT_VALUES, date: todayYMD() });
    }
  }, [isOpen, reset]);

  const onSubmit = handleSubmit((data) => {
    const payload = {
      studio_id: studioId,
      date: data.date,
      is_all_day: data.is_all_day,
      start_time: data.is_all_day ? undefined : data.start_time || undefined,
      end_time: data.is_all_day ? undefined : data.end_time || undefined,
      reason: data.reason,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: 'ブロック枠を追加しました',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        reset(DEFAULT_VALUES);
        onClose();
      },
      onError: (error) => {
        toast({
          title: 'ブロック枠の追加に失敗しました',
          description: getErrorMessage(error),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'lg' }}
      closeOnOverlayClick={!createMutation.isPending}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新規ブロック枠</ModalHeader>
        <ModalCloseButton isDisabled={createMutation.isPending} />
        <form onSubmit={onSubmit}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.date} isRequired>
                <FormLabel>日付</FormLabel>
                <Input
                  type="date"
                  min={todayYMD()}
                  {...register('date')}
                />
                <FormErrorMessage>{errors.date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.is_all_day}>
                <HStack justify="space-between">
                  <FormLabel mb={0} htmlFor="is_all_day">
                    終日ブロック
                  </FormLabel>
                  <Controller
                    name="is_all_day"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="is_all_day"
                        isChecked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        colorScheme="brand"
                      />
                    )}
                  />
                </HStack>
              </FormControl>

              {!isAllDay && (
                <HStack spacing={3} align="flex-start">
                  <FormControl isInvalid={!!errors.start_time} isRequired>
                    <FormLabel>開始時刻</FormLabel>
                    <Input type="time" {...register('start_time')} />
                    <FormErrorMessage>
                      {errors.start_time?.message}
                    </FormErrorMessage>
                  </FormControl>
                  <FormControl isInvalid={!!errors.end_time} isRequired>
                    <FormLabel>終了時刻</FormLabel>
                    <Input type="time" {...register('end_time')} />
                    <FormErrorMessage>
                      {errors.end_time?.message}
                    </FormErrorMessage>
                  </FormControl>
                </HStack>
              )}

              <FormControl isInvalid={!!errors.reason} isRequired>
                <FormLabel>理由</FormLabel>
                <Textarea
                  placeholder="例: 設備メンテナンス、プライベート利用、休業日 など"
                  maxLength={200}
                  rows={3}
                  {...register('reason')}
                />
                <HStack justify="space-between" mt={1}>
                  <FormErrorMessage mt={0}>
                    {errors.reason?.message}
                  </FormErrorMessage>
                  <Text fontSize="xs" color="gray.500" ml="auto">
                    {reasonValue.length} / 200
                  </Text>
                </HStack>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              isDisabled={createMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={createMutation.isPending}
            >
              追加する
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
