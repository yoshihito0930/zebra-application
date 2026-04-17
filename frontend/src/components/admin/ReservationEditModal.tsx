import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Reservation } from '../../types';
import { mockUpdateReservation, type UpdateReservationRequest } from '../../services/reservationService';

interface ReservationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
}

interface FormData {
  date: string;
  start_time: string;
  end_time: string;
  shooting_details: string;
  note: string;
}

export const ReservationEditModal = ({ isOpen, onClose, reservation }: ReservationEditModalProps) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      shooting_details: reservation.shooting_details,
      note: reservation.note || '',
    },
  });

  // 予約更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateReservationRequest) => {
      return mockUpdateReservation(reservation.reservation_id, data);
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['reservation', reservation.reservation_id] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });

      toast({
        title: '予約を更新しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
      reset();
    },
    onError: (error) => {
      toast({
        title: '予約の更新に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // 変更があったフィールドのみ送信
    const updateData: UpdateReservationRequest = {};

    if (data.date !== reservation.date) {
      updateData.date = data.date;
    }
    if (data.start_time !== reservation.start_time) {
      updateData.start_time = data.start_time;
    }
    if (data.end_time !== reservation.end_time) {
      updateData.end_time = data.end_time;
    }
    if (data.shooting_details !== reservation.shooting_details) {
      updateData.shooting_details = data.shooting_details;
    }
    if (data.note !== (reservation.note || '')) {
      updateData.note = data.note;
    }

    // 変更がない場合は何もしない
    if (Object.keys(updateData).length === 0) {
      toast({
        title: '変更がありません',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    updateMutation.mutate(updateData);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>予約内容を編集</ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* 日付 */}
              <FormControl isInvalid={!!errors.date}>
                <FormLabel>利用日</FormLabel>
                <Input
                  type="date"
                  {...register('date', {
                    required: '利用日を入力してください',
                  })}
                />
              </FormControl>

              {/* 開始時間 */}
              <FormControl isInvalid={!!errors.start_time}>
                <FormLabel>開始時間</FormLabel>
                <Input
                  type="time"
                  {...register('start_time', {
                    required: '開始時間を入力してください',
                  })}
                />
              </FormControl>

              {/* 終了時間 */}
              <FormControl isInvalid={!!errors.end_time}>
                <FormLabel>終了時間</FormLabel>
                <Input
                  type="time"
                  {...register('end_time', {
                    required: '終了時間を入力してください',
                    validate: (value, formValues) => {
                      if (value <= formValues.start_time) {
                        return '終了時間は開始時間より後にしてください';
                      }
                      return true;
                    },
                  })}
                />
              </FormControl>

              {/* 撮影詳細 */}
              <FormControl isInvalid={!!errors.shooting_details}>
                <FormLabel>撮影詳細</FormLabel>
                <Textarea
                  {...register('shooting_details', {
                    required: '撮影詳細を入力してください',
                    maxLength: { value: 500, message: '500文字以内で入力してください' },
                  })}
                  rows={3}
                  placeholder="例: 商品撮影、ポートレート撮影など"
                />
              </FormControl>

              {/* 備考 */}
              <FormControl isInvalid={!!errors.note}>
                <FormLabel>備考</FormLabel>
                <Textarea
                  {...register('note', {
                    maxLength: { value: 500, message: '500文字以内で入力してください' },
                  })}
                  rows={3}
                  placeholder="その他の備考があれば入力してください"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isSubmitting}>
              キャンセル
            </Button>
            <Button colorScheme="blue" type="submit" isLoading={isSubmitting}>
              更新
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
