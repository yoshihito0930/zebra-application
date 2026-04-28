import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { Calendar, Clock, User, Mail, Phone, Building, AlertCircle } from 'lucide-react';
import { mockGetGuestReservation, mockCancelGuestReservation } from '../../services/reservationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import type { Reservation } from '../../types';

export default function GuestReservationDetailPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { isOpen: isCancelModalOpen, onOpen: onCancelModalOpen, onClose: onCancelModalClose } = useDisclosure();

  const fetchReservation = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await mockGetGuestReservation(token);
      setReservation(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 予約データ取得
  useEffect(() => {
    if (!token) {
      setError('トークンが指定されていません');
      setIsLoading(false);
      return;
    }

    fetchReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // キャンセル処理
  const handleCancel = async () => {
    if (!token) return;

    setIsCancelling(true);
    try {
      await mockCancelGuestReservation(token);

      toast({
        title: '予約をキャンセルしました',
        description: 'キャンセル確認のメールをお送りしました',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onCancelModalClose();
      fetchReservation(); // 再取得
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約のキャンセルに失敗しました';
      toast({
        title: 'エラー',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.md" py={8}>
        <LoadingSpinner />
      </Container>
    );
  }

  if (error || !reservation) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" color="brand.600" mb={2}>
              予約確認
            </Heading>
            <Text color="gray.600">ゲスト予約の詳細を確認できます</Text>
          </Box>

          <ErrorMessage message={error || '予約が見つかりませんでした'} />

          <Button colorScheme="brand" onClick={() => navigate('/reservations/guest/verify')}>
            トークンを入力する
          </Button>
        </VStack>
      </Container>
    );
  }

  const canCancel = reservation.status === 'pending' || reservation.status === 'tentative' || reservation.status === 'confirmed';

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" color="brand.600" mb={2}>
            予約詳細
          </Heading>
          <Text color="gray.600">ゲスト予約の詳細</Text>
        </Box>

        {reservation.status === 'cancelled' && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>キャンセル済み</AlertTitle>
              <AlertDescription>この予約はキャンセルされています</AlertDescription>
            </Box>
          </Alert>
        )}

        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <VStack spacing={6} align="stretch">
            {/* ステータス */}
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                予約ステータス
              </Text>
              <StatusBadge status={reservation.status} />
            </HStack>

            <Divider />

            {/* ゲスト情報 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>
                予約者情報
              </Text>
              <VStack align="stretch" spacing={3}>
                <HStack>
                  <User size={16} />
                  <Text fontSize="sm" color="gray.600">
                    お名前:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.guest_name}
                  </Text>
                </HStack>

                <HStack>
                  <Mail size={16} />
                  <Text fontSize="sm" color="gray.600">
                    メール:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.guest_email}
                  </Text>
                </HStack>

                <HStack>
                  <Phone size={16} />
                  <Text fontSize="sm" color="gray.600">
                    電話番号:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.guest_phone}
                  </Text>
                </HStack>

                {reservation.guest_company && (
                  <HStack>
                    <Building size={16} />
                    <Text fontSize="sm" color="gray.600">
                      会社名:
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {reservation.guest_company}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* 予約情報 */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3}>
                予約内容
              </Text>
              <VStack align="stretch" spacing={3}>
                <HStack>
                  <Calendar size={16} />
                  <Text fontSize="sm" color="gray.600">
                    日付:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.date}
                  </Text>
                </HStack>

                <HStack>
                  <Clock size={16} />
                  <Text fontSize="sm" color="gray.600">
                    時間:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.start_time} 〜 {reservation.end_time}
                  </Text>
                </HStack>

                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    プラン:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.plan_name}
                  </Text>
                </HStack>

                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    料金:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    ¥{reservation.plan_price.toLocaleString()}
                  </Text>
                </HStack>

                {reservation.options && reservation.options.length > 0 && (
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      オプション:
                    </Text>
                    <VStack align="stretch" spacing={1} pl={4}>
                      {reservation.options.map((option) => (
                        <HStack key={option.option_id}>
                          <Text fontSize="sm">・{option.option_name}</Text>
                          <Text fontSize="sm" color="gray.600">
                            ¥{option.price.toLocaleString()}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    撮影種別:
                  </Text>
                  <HStack spacing={2}>
                    {reservation.shooting_type.map((type) => (
                      <Badge key={type} colorScheme="blue">
                        {type === 'stills' ? 'スチール撮影' : type === 'video' ? 'ムービー撮影' : type === 'music_with_restrictions' ? '楽器の演奏を伴う撮影(制限あり)' : type}
                      </Badge>
                    ))}
                  </HStack>
                </HStack>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    撮影詳細:
                  </Text>
                  <Text fontSize="sm" bg="gray.50" p={3} borderRadius="md">
                    {reservation.shooting_details}
                  </Text>
                </Box>

                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    カメラマン名:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.photographer_name}
                  </Text>
                </HStack>

                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    参加人数:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {reservation.number_of_people}名
                  </Text>
                </HStack>

                {reservation.note && (
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      備考:
                    </Text>
                    <Text fontSize="sm" bg="gray.50" p={3} borderRadius="md">
                      {reservation.note}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* アクション */}
            <HStack spacing={4}>
              <Button flex={1} variant="outline" onClick={() => navigate('/customer/calendar')}>
                カレンダーに戻る
              </Button>

              {canCancel && (
                <Button flex={1} colorScheme="red" onClick={onCancelModalOpen}>
                  予約をキャンセル
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">予約確認リンクについて</AlertTitle>
            <AlertDescription fontSize="xs">
              このページのURLをブックマークしておくと、いつでも予約内容を確認できます。
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>

      {/* キャンセル確認モーダル */}
      <Modal isOpen={isCancelModalOpen} onClose={onCancelModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>予約のキャンセル</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack>
                <AlertCircle size={24} color="red" />
                <Text fontWeight="semibold">本当にキャンセルしますか?</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                キャンセルした予約は元に戻すことができません。
              </Text>
              <Box bg="gray.50" p={4} borderRadius="md">
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm">日付:</Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {reservation.date}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm">時間:</Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {reservation.start_time} 〜 {reservation.end_time}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCancelModalClose} isDisabled={isCancelling}>
              戻る
            </Button>
            <Button colorScheme="red" onClick={handleCancel} isLoading={isCancelling} loadingText="キャンセル中...">
              キャンセルする
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
