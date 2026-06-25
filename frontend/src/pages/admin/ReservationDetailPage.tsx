import {
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Button,
  Divider,
  Badge,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowLeft, CheckCircle, Calendar as CalendarIcon, User, Mail, Phone, Building, Edit } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReservation } from '../../hooks/useReservations';
import { calculateReservationTotal, calculateUsageHours } from '../../utils/reservationPrice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import { ReservationApprovalDialog } from '../../components/admin/ReservationApprovalDialog';
import { ApprovalEmailReviewModal } from '../../components/admin/ApprovalEmailReviewModal';
import { ReservationEditModal } from '../../components/admin/ReservationEditModal';

export const ReservationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });

  // React Queryで予約詳細取得
  const { data: reservation, isLoading, error } = useReservation(id);

  // 承認ダイアログ
  const { isOpen: isApprovalDialogOpen, onOpen: onApprovalDialogOpen, onClose: onApprovalDialogClose } = useDisclosure();

  // 編集モーダル
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();

  // 承認後に開く承認メールのレビュー画面
  const { isOpen: isReviewModalOpen, onOpen: onReviewModalOpen, onClose: onReviewModalClose } = useDisclosure();

  // 承認・拒否成功時の処理
  const handleApprovalSuccess = () => {
    // React Queryが自動的に再取得
    onApprovalDialogClose();
  };

  // 承認成立後、承認メールのレビュー画面を開く
  const handleApproved = () => {
    onReviewModalOpen();
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

  // 編集可能かチェック
  const canEdit =
    reservation &&
    (reservation.status === 'pending' ||
      reservation.status === 'tentative' ||
      reservation.status === 'confirmed');

  return (
    <Container
      maxW={{ base: 'full', md: 'container.lg' }}
      px={{ base: 0, md: 6 }}
      py={{ base: 0, md: 8 }}
    >
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between" align="flex-start">
          <Button
            leftIcon={<ArrowLeft size={18} />}
            variant="ghost"
            size={{ base: 'sm', md: 'md' }}
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
            <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" shadow="md">
              <HStack
                justify="space-between"
                align="flex-start"
                mb={4}
                flexWrap="wrap"
                spacing={3}
              >
                <VStack align="flex-start" spacing={2}>
                  <Heading size={{ base: 'md', md: 'lg' }}>
                    予約詳細（管理者画面）
                  </Heading>
                  <HStack spacing={2} flexWrap="wrap">
                    <StatusBadge status={reservation.status} size="md" />
                    <Badge colorScheme="gray" fontSize="sm">
                      {getReservationTypeLabel(reservation.reservation_type)}
                    </Badge>
                    {reservation.is_guest && (
                      <Badge colorScheme="orange" fontSize="sm">
                        ゲスト予約
                      </Badge>
                    )}
                    {reservation.approval_email_sent_at && (
                      <Badge colorScheme="green" fontSize="sm">
                        承認メール送信済み（
                        {new Date(reservation.approval_email_sent_at).toLocaleString('ja-JP')}）
                      </Badge>
                    )}
                  </HStack>
                </VStack>

                {/* デスクトップのみ上部に表示。モバイルは下部 sticky バー */}
                {!isMobile && (
                  <HStack spacing={3}>
                    {canApprove && (
                      <Button
                        leftIcon={<CheckCircle size={18} />}
                        colorScheme="green"
                        onClick={onApprovalDialogOpen}
                      >
                        承認・拒否
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        leftIcon={<Edit size={18} />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={onEditModalOpen}
                      >
                        編集
                      </Button>
                    )}
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
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
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

              {/* 会員予約者情報 */}
              {!reservation.is_guest && (
                <>
                  <Box bg="blue.50" p={4} borderRadius="md" mb={6}>
                    <Heading size="sm" mb={3}>
                      会員予約者情報
                    </Heading>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <User size={16} />
                          <Text fontSize="sm" color="gray.500">
                            名前
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.user_name || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Mail size={16} />
                          <Text fontSize="sm" color="gray.500">
                            メールアドレス
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.user_email || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Phone size={16} />
                          <Text fontSize="sm" color="gray.500">
                            電話番号
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.user_phone || '-'}</Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={1}>
                          <Building size={16} />
                          <Text fontSize="sm" color="gray.500">
                            会社名
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">{reservation.user_company || '-'}</Text>
                      </Box>
                    </Grid>
                    <Box mt={3}>
                      <Text fontSize="xs" color="gray.500">
                        ユーザーID: {reservation.user_id}
                      </Text>
                    </Box>
                  </Box>
                  <Divider mb={6} />
                </>
              )}

              {/* 予約情報 */}
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
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
                        {reservation.start_time} - {reservation.end_time}（
                        {calculateUsageHours(reservation.start_time, reservation.end_time)}時間）
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        プラン
                      </Text>
                      <Text fontWeight="medium">
                        {reservation.plan_name}（¥{reservation.plan_price.toLocaleString()}-）
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
              {(() => {
                const price = calculateReservationTotal(reservation);
                return (
                  <Box bg="gray.50" p={4} borderRadius="md">
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <Text>
                          プラン料金（¥{reservation.plan_price.toLocaleString()} × {price.hours}時間）
                        </Text>
                        <Text fontWeight="medium">¥{price.planTotal.toLocaleString()}</Text>
                      </HStack>
                      {reservation.options.length > 0 && (
                        <HStack justify="space-between">
                          <Text>オプション料金</Text>
                          <Text fontWeight="medium">¥{price.optionsTotal.toLocaleString()}</Text>
                        </HStack>
                      )}
                      {price.insuranceTotal > 0 && (
                        <HStack justify="space-between">
                          <Text>機材保険</Text>
                          <Text fontWeight="medium">¥{price.insuranceTotal.toLocaleString()}</Text>
                        </HStack>
                      )}
                      <HStack justify="space-between">
                        <Text>小計</Text>
                        <Text fontWeight="medium">¥{price.subtotal.toLocaleString()}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>消費税</Text>
                        <Text fontWeight="medium">¥{price.tax.toLocaleString()}</Text>
                      </HStack>
                      <Divider />
                      <HStack justify="space-between">
                        <Text fontSize="lg" fontWeight="bold">
                          合計
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color="brand.600">
                          ¥{price.total.toLocaleString()}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                );
              })()}
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
            onApproved={handleApproved}
          />
        )}

        {/* 承認メールのレビュー・送信 */}
        {reservation && (
          <ApprovalEmailReviewModal
            isOpen={isReviewModalOpen}
            onClose={onReviewModalClose}
            reservation={reservation}
          />
        )}

        {/* 編集モーダル */}
        {reservation && (
          <ReservationEditModal
            isOpen={isEditModalOpen}
            onClose={onEditModalClose}
            reservation={reservation}
          />
        )}

        {/* モバイルで下部 sticky アクションバーが出るときは、コンテンツ下端の隠れ防止用にスペース確保 */}
        {isMobile && reservation && (canApprove || canEdit) && <Box h="72px" aria-hidden />}
      </VStack>

      {/* モバイル: 下部 sticky アクションバー (ボトムナビの上に重ねる) */}
      {isMobile && reservation && (canApprove || canEdit) && (
        <Box
          position="fixed"
          left={0}
          right={0}
          bottom="64px"
          bg="white"
          borderTopWidth="1px"
          borderColor="gray.200"
          px={3}
          py={3}
          zIndex={15}
          pb={`calc(env(safe-area-inset-bottom) + 12px)`}
        >
          <HStack spacing={2}>
            {canApprove && (
              <Button
                flex={1}
                leftIcon={<CheckCircle size={16} />}
                colorScheme="green"
                onClick={onApprovalDialogOpen}
              >
                承認・拒否
              </Button>
            )}
            {canEdit && (
              <Button
                flex={1}
                leftIcon={<Edit size={16} />}
                colorScheme="blue"
                variant="outline"
                onClick={onEditModalOpen}
              >
                編集
              </Button>
            )}
          </HStack>
        </Box>
      )}
    </Container>
  );
};
