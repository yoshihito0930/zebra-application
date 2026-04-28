import { useEffect } from 'react';
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
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../../utils/validationSchemas';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { login, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // メール検証完了/パスワードリセット完了時の通知
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast({
        title: 'メールアドレスが検証されました',
        description: 'ログインしてご利用ください',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }
    if (searchParams.get('reset') === 'true') {
      toast({
        title: 'パスワードがリセットされました',
        description: '新しいパスワードでログインしてください',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [searchParams, toast]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      // ログイン成功時は useAuth 内でリダイレクトされる
    } catch {
      // エラーは useAuth で管理される
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
          {error && (
            <ErrorMessage
              message={error}
              onClose={clearError}
            />
          )}

          {/* テストユーザー情報 */}
          <Alert status="info" borderRadius="md" fontSize="sm">
            <AlertIcon />
            <VStack align="flex-start" spacing={1} fontSize="xs">
              <Text fontWeight="bold">テストユーザー:</Text>
              <Text>顧客: customer@example.com / password</Text>
              <Text>管理者: admin@example.com / password</Text>
              <Text>スタッフ: staff@example.com / password</Text>
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
                <HStack justify="space-between" mb={2}>
                  <FormLabel mb={0}>パスワード</FormLabel>
                  <Link
                    fontSize="sm"
                    color="brand.600"
                    fontWeight="semibold"
                    onClick={() => navigate('/forgot-password')}
                  >
                    パスワードを忘れた方
                  </Link>
                </HStack>
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
