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
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowLeft, CheckCircle, XCircle, Calendar as CalendarIcon, User, Mail, Phone, Building } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReservation } from '../../hooks/useReservations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import { ReservationApprovalDialog } from '../../components/admin/ReservationApprovalDialog';

export const ReservationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // React Queryで予約詳細取得
  const { data: reservation, isLoading, error } = useReservation(id);

  // 承認ダイアログ
  const { isOpen: isApprovalDialogOpen, onOpen: onApprovalDialogOpen, onClose: onApprovalDialogClose } = useDisclosure();

  // 承認・拒否成功時の処理
  const handleApprovalSuccess = () => {
    // React Queryが自動的に再取得
    onApprovalDialogClose();
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

  // 承認・拒否可能かチェック
  const canApprove = reservation && reservation.status === 'pending';

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between" align="flex-start">
          <Button
            leftIcon={<ArrowLeft size={18} />}
            variant="ghost"
            onClick={() => navigate('/admin/reservations')}
          >
            予約一覧に戻る
          </Button>
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
                  <Heading size="lg">予約詳細（管理者画面）</Heading>
                  <HStack spacing={3}>
                    <StatusBadge status={reservation.status} size="md" />
                    <Badge colorScheme="gray" fontSize="sm">
                      {getReservationTypeLabel(reservation.reservation_type)}
                    </Badge>
                    {reservation.is_guest && (
                      <Badge colorScheme="orange" fontSize="sm">
                        ゲスト予約
                      </Badge>
                    )}
                  </HStack>
                </VStack>

                {canApprove && (
                  <HStack spacing={3}>
                    <Button
                      leftIcon={<CheckCircle size={18} />}
                      colorScheme="green"
                      onClick={onApprovalDialogOpen}
                    >
                      承認・拒否
                    </Button>
                  </HStack>
                )}
              </HStack>

              <Divider mb={6} />

              {/* ゲスト予約者情報 */}
              {reservation.is_guest && (
                <>
                  <Box bg="orange.50" p={4} borderRadius="md" mb={6}>
                    <Heading size="sm" mb={3}>
                      ゲスト予約者情報
                    </Heading>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <User size={16} />
                          <Text fontSize="sm" color="gray.500">
                            名前
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.guest_name || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Mail size={16} />
                          <Text fontSize="sm" color="gray.500">
                            メールアドレス
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.guest_email || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Phone size={16} />
                          <Text fontSize="sm" color="gray.500">
                            電話番号
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.guest_phone || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Building size={16} />
                          <Text fontSize="sm" color="gray.500">
                            会社名
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.guest_company || '-'}</Text>
                      </Box>
                    </Grid>
                  </Box>
                  <Divider mb={6} />
                </>
              )}

              {/* 予約情報 */}
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                <GridItem>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        予約ID
                      </Text>
                      <Text fontWeight="medium" fontFamily="mono">
                        {reservation.reservation_id}
                      </Text>
                    </Box>

                    {!reservation.is_guest && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>
                          ユーザーID
                        </Text>
                        <Text fontWeight="medium" fontFamily="mono">
                          {reservation.user_id}
                        </Text>
                      </Box>
                    )}

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
                            {type === 'stills' ? 'スチール' : type === 'video' ? '動画' : type}
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
                        reservation.plan_price * reservation.plan_tax_rate +
                          reservation.options.reduce((sum, opt) => sum + opt.price * opt.tax_rate, 0)
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
                    {formatDate(reservation.expiry_date)}まで有効です。
                  </Text>
                </VStack>
              </Alert>
            )}

            {/* キャンセル情報 */}
            {reservation.status === 'cancelled' && reservation.cancelled_at && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text fontWeight="semibold">キャンセル済み</Text>
                  <Text fontSize="sm">
                    キャンセル日時: {formatDate(reservation.cancelled_at)}
                  </Text>
                  {reservation.cancelled_by && (
                    <Text fontSize="sm">
                      キャンセル者: {reservation.cancelled_by === 'customer' ? '顧客' : 'スタジオ'}
                    </Text>
                  )}
                </VStack>
              </Alert>
            )}
          </>
        )}

        {/* 承認ダイアログ */}
        {reservation && (
          <ReservationApprovalDialog
            isOpen={isApprovalDialogOpen}
            onClose={onApprovalDialogClose}
            reservation={reservation}
            onSuccess={handleApprovalSuccess}
          />
        )}
      </VStack>
    </Container>
  );
};
