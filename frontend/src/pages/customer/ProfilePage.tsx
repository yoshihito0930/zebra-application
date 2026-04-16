import { useState } from 'react';
import {
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  useToast,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import { User, Edit, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { mockUpdateProfile, mockChangePassword } from '../../services/authService';
import { updateProfileSchema, changePasswordSchema } from '../../utils/validationSchemas';
import type { UpdateProfileFormData, ChangePasswordFormData } from '../../utils/validationSchemas';

export default function ProfilePage() {
  const toast = useToast();
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // プロフィール編集モーダル
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();

  // パスワード変更モーダル
  const {
    isOpen: isPasswordModalOpen,
    onOpen: onPasswordModalOpen,
    onClose: onPasswordModalClose,
  } = useDisclosure();

  // プロフィール編集フォーム
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      phone_number: user?.phone_number || '',
      company_name: user?.company_name || '',
      address: user?.address || '',
    },
  });

  // パスワード変更フォーム
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // プロフィール更新処理
  const onSubmitEdit = async (data: UpdateProfileFormData) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const updatedUser = await mockUpdateProfile(user.user_id, data);
      setUser(updatedUser);
      toast({
        title: 'プロフィールを更新しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditModalClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'プロフィールの更新に失敗しました';
      toast({
        title: 'エラー',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // パスワード変更処理
  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    if (!user) return;

    setIsChangingPassword(true);
    try {
      await mockChangePassword(user.user_id, {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast({
        title: 'パスワードを変更しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      resetPassword();
      onPasswordModalClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'パスワードの変更に失敗しました';
      toast({
        title: 'エラー',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // モーダルを開く時にフォームをリセット
  const handleEditModalOpen = () => {
    resetEdit({
      name: user?.name || '',
      phone_number: user?.phone_number || '',
      company_name: user?.company_name || '',
      address: user?.address || '',
    });
    onEditModalOpen();
  };

  if (!user) {
    return (
      <Container maxW="container.lg" py={8}>
        <Text>ユーザー情報が見つかりません</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        {/* ヘッダー */}
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            プロフィール
          </Heading>
          <Text color="gray.600">アカウント情報を管理します</Text>
        </Box>

        {/* プロフィール情報 */}
        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <HStack justify="space-between" align="flex-start" mb={4}>
            <HStack spacing={3}>
              <User size={24} />
              <Heading size="md">基本情報</Heading>
            </HStack>
            <Button
              leftIcon={<Edit size={18} />}
              colorScheme="brand"
              variant="outline"
              size="sm"
              onClick={handleEditModalOpen}
            >
              編集
            </Button>
          </HStack>

          <Divider mb={4} />

          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>
                名前
              </Text>
              <Text fontWeight="medium">{user.name}</Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>
                メールアドレス
              </Text>
              <Text fontWeight="medium">{user.email}</Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>
                電話番号
              </Text>
              <Text fontWeight="medium">{user.phone_number}</Text>
            </Box>

            {user.company_name && (
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  会社名
                </Text>
                <Text fontWeight="medium">{user.company_name}</Text>
              </Box>
            )}

            {user.address && (
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  住所
                </Text>
                <Text fontWeight="medium">{user.address}</Text>
              </Box>
            )}

            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>
                ロール
              </Text>
              <Badge colorScheme={user.role === 'admin' ? 'purple' : 'blue'}>
                {user.role === 'admin' ? '管理者' : user.role === 'staff' ? 'スタッフ' : '顧客'}
              </Badge>
            </Box>
          </VStack>
        </Box>

        {/* パスワード変更 */}
        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <HStack justify="space-between" align="flex-start" mb={4}>
            <HStack spacing={3}>
              <Key size={24} />
              <Heading size="md">パスワード</Heading>
            </HStack>
            <Button
              leftIcon={<Key size={18} />}
              colorScheme="gray"
              variant="outline"
              size="sm"
              onClick={onPasswordModalOpen}
            >
              変更
            </Button>
          </HStack>

          <Divider mb={4} />

          <Text color="gray.600" fontSize="sm">
            セキュリティ保護のため、定期的にパスワードを変更することをお勧めします。
          </Text>
        </Box>

        {/* プロフィール編集モーダル */}
        <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>プロフィール編集</ModalHeader>
            <ModalCloseButton />
            <form onSubmit={handleSubmitEdit(onSubmitEdit)}>
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isInvalid={!!editErrors.name}>
                    <FormLabel>名前</FormLabel>
                    <Input {...registerEdit('name')} placeholder="山田太郎" />
                    <FormErrorMessage>{editErrors.name?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!editErrors.phone_number}>
                    <FormLabel>電話番号</FormLabel>
                    <Input
                      {...registerEdit('phone_number')}
                      placeholder="090-1234-5678"
                    />
                    <FormErrorMessage>{editErrors.phone_number?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!editErrors.company_name}>
                    <FormLabel>会社名（任意）</FormLabel>
                    <Input
                      {...registerEdit('company_name')}
                      placeholder="株式会社サンプル"
                    />
                    <FormErrorMessage>{editErrors.company_name?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!editErrors.address}>
                    <FormLabel>住所（任意）</FormLabel>
                    <Input
                      {...registerEdit('address')}
                      placeholder="東京都渋谷区"
                    />
                    <FormErrorMessage>{editErrors.address?.message}</FormErrorMessage>
                  </FormControl>
                </VStack>
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onEditModalClose} isDisabled={isUpdating}>
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  colorScheme="brand"
                  isLoading={isUpdating}
                  loadingText="更新中..."
                >
                  更新
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* パスワード変更モーダル */}
        <Modal isOpen={isPasswordModalOpen} onClose={onPasswordModalClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>パスワード変更</ModalHeader>
            <ModalCloseButton />
            <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isInvalid={!!passwordErrors.current_password}>
                    <FormLabel>現在のパスワード</FormLabel>
                    <Input
                      type="password"
                      {...registerPassword('current_password')}
                      placeholder="現在のパスワード"
                    />
                    <FormErrorMessage>
                      {passwordErrors.current_password?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!passwordErrors.new_password}>
                    <FormLabel>新しいパスワード</FormLabel>
                    <Input
                      type="password"
                      {...registerPassword('new_password')}
                      placeholder="8文字以上、大文字・小文字・数字を含む"
                    />
                    <FormErrorMessage>{passwordErrors.new_password?.message}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!passwordErrors.confirm_password}>
                    <FormLabel>新しいパスワード（確認）</FormLabel>
                    <Input
                      type="password"
                      {...registerPassword('confirm_password')}
                      placeholder="新しいパスワードを再入力"
                    />
                    <FormErrorMessage>
                      {passwordErrors.confirm_password?.message}
                    </FormErrorMessage>
                  </FormControl>
                </VStack>
              </ModalBody>

              <ModalFooter>
                <Button
                  variant="ghost"
                  mr={3}
                  onClick={onPasswordModalClose}
                  isDisabled={isChangingPassword}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  colorScheme="brand"
                  isLoading={isChangingPassword}
                  loadingText="変更中..."
                >
                  変更
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}
