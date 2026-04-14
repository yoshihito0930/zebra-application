import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Button,
  Link,
  HStack,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../../utils/validationSchemas';
import { mockLogin } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // モックログイン（本番ではlogin関数を使用）
      const response = await mockLogin(data);

      // 認証情報をストアに保存
      setAuth(response.user, response.access_token, response.refresh_token);

      // ロールに応じてリダイレクト
      if (response.user.role === 'admin' || response.user.role === 'staff') {
        navigate('/admin/dashboard');
      } else {
        navigate('/customer/calendar');
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('ログインに失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={20}>
      <Box bg="white" p={8} borderRadius="lg" shadow="md">
        <VStack spacing={6} align="stretch">
          {/* タイトル */}
          <Box textAlign="center">
            <Box w="60px" h="60px" bg="brand.300" borderRadius="md" mx="auto" mb={4} display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="2xl" fontWeight="bold" color="white">
                Z
              </Text>
            </Box>
            <Heading size="lg" color="brand.600" mb={2}>
              ログイン
            </Heading>
            <Text color="gray.600" fontSize="sm">
              スタジオゼブラ予約管理システム
            </Text>
          </Box>

          {/* エラーメッセージ */}
          {errorMessage && (
            <ErrorMessage
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          )}

          {/* テストユーザー情報 */}
          <Alert status="info" borderRadius="md" fontSize="sm">
            <AlertIcon />
            <VStack align="flex-start" spacing={1} fontSize="xs">
              <Text fontWeight="bold">テストユーザー:</Text>
              <Text>顧客: customer@example.com / password</Text>
              <Text>管理者: admin@example.com / password</Text>
            </VStack>
          </Alert>

          {/* フォーム */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
              {/* メールアドレス */}
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>メールアドレス</FormLabel>
                <Input
                  type="email"
                  placeholder="example@studio-zebra.com"
                  {...register('email')}
                />
                {errors.email && (
                  <FormErrorMessage>{errors.email.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* パスワード */}
              <FormControl isInvalid={!!errors.password}>
                <FormLabel>パスワード</FormLabel>
                <Input
                  type="password"
                  placeholder="8文字以上"
                  {...register('password')}
                />
                {errors.password && (
                  <FormErrorMessage>{errors.password.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* ログインボタン */}
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="ログイン中..."
              >
                ログイン
              </Button>
            </VStack>
          </form>

          {/* 区切り線 */}
          <HStack>
            <Divider />
            <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
              または
            </Text>
            <Divider />
          </HStack>

          {/* サインアップリンク */}
          <Box textAlign="center">
            <Text fontSize="sm" color="gray.600">
              アカウントをお持ちでない方は{' '}
              <Link color="brand.600" fontWeight="semibold" onClick={() => navigate('/signup')}>
                新規登録
              </Link>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}
