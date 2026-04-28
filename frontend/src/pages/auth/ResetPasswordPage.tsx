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
  FormHelperText,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

const resetPasswordSchema = z
  .object({
    code: z.string().min(1, '検証コードを入力してください'),
    newPassword: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは大文字、小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const { confirmPassword, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await confirmPassword(email, data.code, data.newPassword);
      // 成功時は useAuth 内でログイン画面にリダイレクトされる
    } catch (error) {
      // エラーは useAuth で管理される
    }
  };

  if (!email) {
    return (
      <Container maxW="container.sm" py={20}>
        <Box bg="white" p={8} borderRadius="lg" shadow="md" textAlign="center">
          <Heading size="md" color="red.600" mb={4}>
            エラー
          </Heading>
          <Text mb={4}>メールアドレスが指定されていません</Text>
          <Button colorScheme="brand" onClick={() => navigate('/forgot-password')}>
            パスワードリセット画面へ戻る
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={20}>
      <Box bg="white" p={8} borderRadius="lg" shadow="md">
        <VStack spacing={6} align="stretch">
          {/* タイトル */}
          <Box textAlign="center">
            <Box w="60px" h="60px" bg="brand.300" borderRadius="md" mx="auto" mb={4} display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="2xl" fontWeight="bold" color="white">
                🔑
              </Text>
            </Box>
            <Heading size="lg" color="brand.600" mb={2}>
              パスワード再設定
            </Heading>
            <Text color="gray.600" fontSize="sm">
              {email} に送信された検証コードと新しいパスワードを入力してください
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
              {/* 検証コード */}
              <FormControl isInvalid={!!errors.code}>
                <FormLabel>検証コード</FormLabel>
                <Input
                  placeholder="メールで受信したコード"
                  {...register('code')}
                />
                {errors.code && (
                  <FormErrorMessage>{errors.code.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* 新しいパスワード */}
              <FormControl isInvalid={!!errors.newPassword}>
                <FormLabel>新しいパスワード</FormLabel>
                <Input
                  type="password"
                  placeholder="8文字以上"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <FormErrorMessage>{errors.newPassword.message}</FormErrorMessage>
                )}
                <FormHelperText fontSize="xs">
                  大文字、小文字、数字を含む8文字以上
                </FormHelperText>
              </FormControl>

              {/* パスワード確認 */}
              <FormControl isInvalid={!!errors.confirmPassword}>
                <FormLabel>パスワード（確認）</FormLabel>
                <Input
                  type="password"
                  placeholder="パスワード再入力"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <FormErrorMessage>{errors.confirmPassword.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* 送信ボタン */}
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="設定中..."
                mt={2}
              >
                パスワードを再設定
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
