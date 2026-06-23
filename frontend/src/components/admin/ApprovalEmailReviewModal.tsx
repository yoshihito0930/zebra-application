import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import type { Reservation } from '../../types';
import { useApprovalEmailPreview, useSendApprovalEmail } from '../../hooks/useReservations';

interface ApprovalEmailReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
}

/**
 * 承認メールのレビューゲート。
 * - 宛先（予約レコード由来、編集不可）・件名・本文の初期値をプレビューAPIから取得して表示する。
 * - 本文はテンプレートで初期化されるが、管理者が自由に編集できる。
 * - 変数欠損（missing_variables）がある場合は送信をブロックし、警告を表示する。
 * - 送信後は予約に送信済み状態が記録される。
 */
export const ApprovalEmailReviewModal = ({
  isOpen,
  onClose,
  reservation,
}: ApprovalEmailReviewModalProps) => {
  const toast = useToast();
  const {
    data: preview,
    isLoading,
    isError,
  } = useApprovalEmailPreview(reservation.reservation_id, isOpen);
  const sendMutation = useSendApprovalEmail();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // プレビュー取得後、編集フィールドの初期値をセットする。
  useEffect(() => {
    if (preview) {
      setSubject(preview.subject);
      setBody(preview.body);
    }
  }, [preview]);

  const missing = preview?.missing_variables ?? [];
  const hasMissing = missing.length > 0;
  const alreadySentAt = preview?.already_sent_at;

  const handleSend = () => {
    sendMutation.mutate(
      { id: reservation.reservation_id, data: { subject, body } },
      {
        onSuccess: () => {
          toast({
            title: 'メールを送信しました',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          onClose();
        },
        onError: (error) => {
          toast({
            title: 'メールの送信に失敗しました',
            description:
              error instanceof Error ? error.message : '不明なエラーが発生しました',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>承認メールの確認・送信</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Center py={10}>
              <Spinner />
            </Center>
          ) : isError || !preview ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                メール内容の読み込みに失敗しました。時間をおいて再度お試しください。
              </AlertDescription>
            </Alert>
          ) : (
            <VStack align="stretch" spacing={4}>
              {alreadySentAt && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>
                    このメールは {new Date(alreadySentAt).toLocaleString('ja-JP')}{' '}
                    に送信済みです。再送すると上書きされます。
                  </AlertDescription>
                </Alert>
              )}

              {hasMissing && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <VStack align="stretch" spacing={1}>
                    <AlertTitle>送信できません</AlertTitle>
                    <AlertDescription>
                      次の項目が未入力のため送信をブロックしています:{' '}
                      {missing.join('、')}
                    </AlertDescription>
                  </VStack>
                </Alert>
              )}

              <FormControl>
                <FormLabel>宛先</FormLabel>
                {/* 宛先は予約レコード由来。手入力できないよう読み取り専用にする。 */}
                <Input value={preview.to} isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>件名</FormLabel>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>本文</FormLabel>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  テンプレートで初期化されています。内容を編集して送信できます。
                </Text>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  fontFamily="mono"
                />
              </FormControl>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={sendMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            colorScheme="green"
            onClick={handleSend}
            isLoading={sendMutation.isPending}
            isDisabled={isLoading || isError || !preview || hasMissing}
          >
            送信
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
