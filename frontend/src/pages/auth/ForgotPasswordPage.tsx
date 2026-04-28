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
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

const forgotPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data.email);
      // 成功時は useAuth 内でパスワード再設定画面にリダイレクトされる
    } catch (error) {
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
                🔒
              </Text>
            </Box>
            <Heading size="lg" color="brand.600" mb={2}>
              パスワードリセット
            </Heading>
            <Text color="gray.600" fontSize="sm">
              登録されているメールアドレスを入力してください
            </Text>
          </Box>

          {/* エラーメッセージ */}
          {error && (
            <ErrorMessage
              message={error}
              onClose={clearError}
            />
          )}

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

              {/* 送信ボタン */}
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="送信中..."
              >
                リセット用コードを送信
              </Button>
            </VStack>
          </form>

          {/* ログインリンク */}
          <Box textAlign="center" pt={2} borderTop="1px solid" borderColor="gray.200">
            <Text fontSize="sm" color="gray.600">
              <Link color="brand.600" fontWeight="semibold" onClick={() => navigate('/login')}>
                ログイン画面に戻る
              </Link>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}
