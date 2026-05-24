import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useDeleteBlockedSlot } from '../../../hooks/useBlockedSlots';
import { getErrorMessage } from '../../../services/api';
import type { BlockedSlot } from '../../../types';

interface DeleteBlockedSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slot: BlockedSlot | null;
}

export default function DeleteBlockedSlotDialog({
  isOpen,
  onClose,
  slot,
}: DeleteBlockedSlotDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const deleteMutation = useDeleteBlockedSlot();

  const handleConfirm = () => {
    if (!slot) return;
    deleteMutation.mutate(slot.blocked_slot_id, {
      onSuccess: () => {
        toast({
          title: 'ブロック枠を削除しました',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: 'ブロック枠の削除に失敗しました',
          description: getErrorMessage(error),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  const timeRangeText = slot
    ? slot.is_all_day
      ? '終日'
      : `${slot.start_time} – ${slot.end_time}`
    : '';

  const dateText = slot
    ? format(parseISO(slot.date), 'yyyy年M月d日(E)', { locale: ja })
    : '';

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={!deleteMutation.isPending}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            ブロック枠を削除
          </AlertDialogHeader>

          <AlertDialogBody>
            <Text mb={3}>
              下記のブロック枠を削除します。よろしいですか？
            </Text>
            {slot && (
              <Box bg="gray.50" borderRadius="md" p={3}>
                <Text fontWeight="medium">{dateText}</Text>
                <Text fontSize="sm" color="gray.700">
                  {timeRangeText}
                </Text>
                <Text fontSize="sm" color="gray.600" mt={1} noOfLines={3}>
                  理由: {slot.reason}
                </Text>
              </Box>
            )}
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              onClick={onClose}
              isDisabled={deleteMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              colorScheme="red"
              ml={3}
              onClick={handleConfirm}
              isLoading={deleteMutation.isPending}
            >
              削除する
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
