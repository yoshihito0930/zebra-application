import { useRef } from 'react';
import {
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Button,
  useToast,
  Divider,
  Badge,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowLeft, X, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReservation, useCancelReservation } from '../../hooks/useReservations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // React Queryで予約詳細取得
  const { data: reservation, isLoading, error } = useReservation(id);

  // React Queryで予約キャンセル
  const cancelMutation = useCancelReservation();

  // キャンセル確認ダイアログ
  const { isOpen: isCancelDialogOpen, onOpen: onCancelDialogOpen, onClose: onCancelDialogClose } = useDisclosure();
  const cancelRef = useRef(null);

  // 予約キャンセル
  const handleCancel = async () => {
    if (!id) return;

    cancelMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: '予約をキャンセルしました',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onCancelDialogClose();
      },
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : 'キャンセルに失敗しました';
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

  // 予約種別のラベル
  const getReservationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: '本予約',
      tentative: '仮予約',
      location_scout: 'ロケハン',
      second_keep: '第2キープ',
    };
    return labels[type] || type;
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // キャンセル可能かチェック
  const isCancellable = reservation && ['pending', 'confirmed', 'tentative', 'waitlisted'].includes(reservation.status);

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between" align="flex-start">
          <HStack spacing={4}>
            <Button
              leftIcon={<ArrowLeft size={18} />}
              variant="ghost"
              onClick={() => navigate('/customer/reservations')}
            >
              予約一覧に戻る
            </Button>
          </HStack>
        </HStack>

        {/* ローディング・エラー表示 */}
        {isLoading && <LoadingSpinner />}

        {error && !isLoading && <ErrorMessage message={error instanceof Error ? error.message : '予約の取得に失敗しました'} />}

        {/* 予約詳細 */}
        {!isLoading && !error && reservation && (
          <>
            {/* ステータスと操作 */}
            <Box bg="white" p={6} borderRadius="lg" shadow="md">
              <HStack justify="space-between" align="flex-start" mb={4}>
                <VStack align="flex-start" spacing={2}>
                  <Heading size="lg">予約詳細</Heading>
                  <HStack spacing={3}>
                    <StatusBadge status={reservation.status} size="md" />
                    <Badge colorScheme="gray" fontSize="sm">
                      {getReservationTypeLabel(reservation.reservation_type)}
                    </Badge>
                  </HStack>
                </VStack>

                {isCancellable && (
                  <Button
                    leftIcon={<X size={18} />}
                    colorScheme="red"
                    variant="outline"
                    onClick={onCancelDialogOpen}
                  >
                    キャンセル
                  </Button>
                )}
              </HStack>

              <Divider mb={6} />

              {/* 予約情報 */}
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                <GridItem>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        予約ID
                      </Text>
                      <Text fontWeight="medium">{reservation.reservation_id}</Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        利用日
                      </Text>
                      <HStack spacing={2}>
                        <CalendarIcon size={16} />
                        <Text fontWeight="medium">{formatDate(reservation.date)}</Text>
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        利用時間
                      </Text>
                      <Text fontWeight="medium">
                        {reservation.start_time} - {reservation.end_time}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        プラン
                      </Text>
                      <Text fontWeight="medium">{reservation.plan_name}</Text>
                      <Text fontSize="sm" color="gray.600">
                        ¥{reservation.plan_price.toLocaleString()}
                      </Text>
                    </Box>

                    {reservation.options.length > 0 && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          オプション
                        </Text>
                        <VStack align="stretch" spacing={1}>
                          {reservation.options.map((option) => (
                            <HStack key={option.option_id} justify="space-between">
                              <Text fontSize="sm">{option.option_name}</Text>
                              <Text fontSize="sm" color="gray.600">
                                ¥{option.price.toLocaleString()}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                </GridItem>

                <GridItem>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        撮影種別
                      </Text>
                      <HStack spacing={2}>
                        {reservation.shooting_type.map((type) => (
                          <Badge key={type} colorScheme="blue">
                            {type === 'stills' ? 'スチール撮影' : type === 'video' ? 'ムービー撮影' : type === 'music_with_restrictions' ? '楽器の演奏を伴う撮影(制限あり)' : type}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        撮影詳細
                      </Text>
                      <Text>{reservation.shooting_details}</Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        カメラマン
                      </Text>
                      <Text>{reservation.photographer_name}</Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        参加人数
                      </Text>
                      <Text>{reservation.number_of_people}人</Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        その他
                      </Text>
                      <VStack align="stretch" spacing={1}>
                        <HStack>
                          <Badge colorScheme={reservation.needs_protection ? 'orange' : 'gray'}>
                            {reservation.needs_protection ? '養生必要' : '養生不要'}
                          </Badge>
                        </HStack>
                        <HStack>
                          <Badge colorScheme={reservation.equipment_insurance ? 'green' : 'red'}>
                            {reservation.equipment_insurance ? '機材保険あり' : '機材保険なし'}
                          </Badge>
                        </HStack>
                      </VStack>
                    </Box>

                    {reservation.note && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          備考
                        </Text>
                        <Text fontSize="sm">{reservation.note}</Text>
                      </Box>
                    )}
                  </VStack>
                </GridItem>
              </Grid>

              <Divider my={6} />

              {/* 料金 */}
              <Box bg="gray.50" p={4} borderRadius="md">
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text>プラン料金</Text>
                    <Text fontWeight="medium">¥{reservation.plan_price.toLocaleString()}</Text>
                  </HStack>
                  {reservation.options.length > 0 && (
                    <HStack justify="space-between">
                      <Text>オプション料金</Text>
                      <Text fontWeight="medium">
                        ¥{reservation.options.reduce((sum, opt) => sum + opt.price, 0).toLocaleString()}
                      </Text>
                    </HStack>
                  )}
                  <HStack justify="space-between">
                    <Text>小計</Text>
                    <Text fontWeight="medium">
                      ¥
                      {(
                        reservation.plan_price +
                        reservation.options.reduce((sum, opt) => sum + opt.price, 0)
                      ).toLocaleString()}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>消費税</Text>
                    <Text fontWeight="medium">
                      ¥
                      {Math.floor(
                        (reservation.plan_price * reservation.plan_tax_rate +
                          reservation.options.reduce((sum, opt) => sum + opt.price * opt.tax_rate, 0))
                      ).toLocaleString()}
                    </Text>
                  </HStack>
                  <Divider />
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="bold">
                      合計
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="brand.600">
                      ¥
                      {(
                        reservation.plan_price +
                        reservation.options.reduce((sum, opt) => sum + opt.price, 0) +
                        Math.floor(
                          reservation.plan_price * reservation.plan_tax_rate +
                            reservation.options.reduce((sum, opt) => sum + opt.price * opt.tax_rate, 0)
                        )
                      ).toLocaleString()}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </Box>

            {/* 仮予約の期限通知 */}
            {reservation.reservation_type === 'tentative' && reservation.expiry_date && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text fontWeight="semibold">仮予約の有効期限</Text>
                  <Text fontSize="sm">
                    {formatDate(reservation.expiry_date)}まで有効です。期限までに本予約へ切り替えてください。
                  </Text>
                </VStack>
              </Alert>
            )}
          </>
        )}

        {/* キャンセル確認ダイアログ */}
        <AlertDialog
          isOpen={isCancelDialogOpen}
          leastDestructiveRef={cancelRef}
          onClose={onCancelDialogClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                予約をキャンセル
              </AlertDialogHeader>

              <AlertDialogBody>
                この予約をキャンセルしてもよろしいですか？キャンセル後は元に戻せません。
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onCancelDialogClose}>
                  戻る
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleCancel}
                  ml={3}
                  isLoading={cancelMutation.isPending}
                  loadingText="キャンセル中..."
                >
                  キャンセルする
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </VStack>
    </Container>
  );
}
