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
} from '@chakra-ui/react';
import { useRef } from 'react';

interface ToggleActiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'plan' | 'option';
  itemName: string;
  isActive: boolean;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function ToggleActiveDialog({
  isOpen,
  onClose,
  itemType,
  itemName,
  isActive,
  onConfirm,
  isLoading,
}: ToggleActiveDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const typeLabel = itemType === 'plan' ? 'プラン' : 'オプション';
  const headerText = isActive
    ? `${typeLabel}を無効化`
    : `${typeLabel}を再有効化`;
  const confirmLabel = isActive ? '無効化する' : '再有効化する';
  const confirmColorScheme = isActive ? 'red' : 'brand';

  const bodyText = isActive
    ? `「${itemName}」を無効化します。既存予約のスナップショットには影響しませんが、今後の予約画面では選択できなくなります。よろしいですか？`
    : `「${itemName}」を再び有効化します。利用者の予約画面で選択可能になります。`;

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={!isLoading}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {headerText}
          </AlertDialogHeader>

          <AlertDialogBody>
            <Text mb={3}>{bodyText}</Text>
            <Box bg="gray.50" borderRadius="md" p={3}>
              <Text fontWeight="medium">{itemName}</Text>
            </Box>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} isDisabled={isLoading}>
              キャンセル
            </Button>
            <Button
              colorScheme={confirmColorScheme}
              ml={3}
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
