import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  RadioGroup,
  Radio,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import type { Reservation } from '../../types';
import { useApproveReservation, useRejectReservation } from '../../hooks/useReservations';

interface ReservationApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onSuccess: () => void;
}

export const ReservationApprovalDialog = ({
  isOpen,
  onClose,
  reservation,
  onSuccess,
}: ReservationApprovalDialogProps) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [approvedStatus, setApprovedStatus] = useState<'confirmed' | 'tentative' | 'scheduled'>(
    reservation.reservation_type === 'location_scout' ? 'scheduled' : 'confirmed'
  );
  const [rejectNote, setRejectNote] = useState('');
  const toast = useToast();

  // React Queryで承認・拒否処理
  const approveMutation = useApproveReservation();
  const rejectMutation = useRejectReservation();

  const handleSubmit = async () => {
    if (action === 'approve') {
      approveMutation.mutate(
        { id: reservation.reservation_id, approvedStatus },
        {
          onSuccess: () => {
            toast({
              title: '予約を承認しました',
              status: 'success',
              duration: 3000,
            });
            onSuccess();
            onClose();
          },
          onError: (error) => {
            toast({
              title: 'エラーが発生しました',
              description: error instanceof Error ? error.message : '予約の承認に失敗しました',
              status: 'error',
              duration: 5000,
            });
          },
        }
      );
    } else {
      rejectMutation.mutate(
        { id: reservation.reservation_id, note: rejectNote },
        {
          onSuccess: () => {
            toast({
              title: '予約を拒否しました',
              status: 'success',
              duration: 3000,
            });
            onSuccess();
            onClose();
          },
          onError: (error) => {
            toast({
              title: 'エラーが発生しました',
              description: error instanceof Error ? error.message : '予約の拒否に失敗しました',
              status: 'error',
              duration: 5000,
            });
          },
        }
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>予約の承認・拒否</ModalHeader>
        <ModalBody>
          <VStack align="stretch" spacing={6}>
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold">予約ID</Text>
              <Text>{reservation.reservation_id}</Text>
            </VStack>

            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold">予約者</Text>
              <Text>
                {reservation.is_guest
                  ? `${reservation.guest_name || 'ゲスト'} (ゲスト予約)`
                  : `ユーザーID: ${reservation.user_id}`}
              </Text>
            </VStack>

            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold">日時</Text>
              <Text>
                {reservation.date} {reservation.start_time} - {reservation.end_time}
              </Text>
            </VStack>

            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold">プラン</Text>
              <Text>{reservation.plan_name}</Text>
            </VStack>

            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold">処理を選択</Text>
              <RadioGroup value={action} onChange={(value) => setAction(value as 'approve' | 'reject')}>
                <VStack align="stretch" spacing={4}>
                  <Radio value="approve">承認する</Radio>
                  {action === 'approve' && (
                    <VStack align="stretch" spacing={2} ml={6}>
                      <RadioGroup
                        value={approvedStatus}
                        onChange={(value) =>
                          setApprovedStatus(value as 'confirmed' | 'tentative' | 'scheduled')
                        }
                      >
                        <VStack align="stretch" spacing={2}>
                          {reservation.reservation_type === 'location_scout' ? (
                            <Radio value="scheduled">ロケハン確定</Radio>
                          ) : (
                            <>
                              <Radio value="confirmed">本予約として確定</Radio>
                              <Radio value="tentative">仮予約として承認</Radio>
                            </>
                          )}
                        </VStack>
                      </RadioGroup>
                    </VStack>
                  )}

                  <Radio value="reject">拒否する</Radio>
                  {action === 'reject' && (
                    <VStack align="stretch" spacing={2} ml={6}>
                      <Text fontSize="sm" color="gray.600">
                        拒否理由（任意）
                      </Text>
                      <Textarea
                        placeholder="拒否理由を入力してください"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        rows={3}
                      />
                    </VStack>
                  )}
                </VStack>
              </RadioGroup>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={approveMutation.isPending || rejectMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            colorScheme={action === 'approve' ? 'green' : 'red'}
            onClick={handleSubmit}
            isLoading={approveMutation.isPending || rejectMutation.isPending}
          >
            {action === 'approve' ? '承認' : '拒否'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
