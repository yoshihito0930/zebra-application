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
  Grid,
  FormHelperText,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { signupSchema, type SignupFormData } from '../../utils/validationSchemas';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      // confirmPasswordを除いてAPIリクエストを送信
      const { confirmPassword, ...signupData } = data;

      // サインアップ（成功時はメール検証画面にリダイレクトされる）
      await signup(signupData);
    } catch (error) {
      // エラーは useAuth で管理される
    }
  };

  return (
    <Container maxW="container.md" py={12}>
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
              新規登録
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

          {/* フォーム */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
              {/* 名前 */}
              <FormControl isInvalid={!!errors.name}>
                <FormLabel>お名前 *</FormLabel>
                <Input
                  placeholder="山田 太郎"
                  {...register('name')}
                />
                {errors.name && (
                  <FormErrorMessage>{errors.name.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* メールアドレスと電話番号 */}
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} w="full">
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel>メールアドレス *</FormLabel>
                  <Input
                    type="email"
                    placeholder="example@studio-zebra.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <FormErrorMessage>{errors.email.message}</FormErrorMessage>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.phone_number}>
                  <FormLabel>電話番号 *</FormLabel>
                  <Input
                    type="tel"
                    placeholder="090-1234-5678"
                    {...register('phone_number')}
                  />
                  {errors.phone_number && (
                    <FormErrorMessage>{errors.phone_number.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Grid>

              {/* パスワード */}
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} w="full">
                <FormControl isInvalid={!!errors.password}>
                  <FormLabel>パスワード *</FormLabel>
                  <Input
                    type="password"
                    placeholder="8文字以上"
                    {...register('password')}
                  />
                  {errors.password && (
                    <FormErrorMessage>{errors.password.message}</FormErrorMessage>
                  )}
                  <FormHelperText fontSize="xs">
                    大文字、小文字、数字を含む8文字以上
                  </FormHelperText>
                </FormControl>

                <FormControl isInvalid={!!errors.confirmPassword}>
                  <FormLabel>パスワード（確認） *</FormLabel>
                  <Input
                    type="password"
                    placeholder="パスワード再入力"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <FormErrorMessage>{errors.confirmPassword.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Grid>

              {/* 会社名（任意） */}
              <FormControl isInvalid={!!errors.company_name}>
                <FormLabel>会社名（任意）</FormLabel>
                <Input
                  placeholder="株式会社サンプル"
                  {...register('company_name')}
                />
                {errors.company_name && (
                  <FormErrorMessage>{errors.company_name.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* 住所 */}
              <FormControl isInvalid={!!errors.address}>
                <FormLabel>住所 *</FormLabel>
                <Input
                  placeholder="東京都渋谷区〇〇..."
                  {...register('address')}
                />
                {errors.address && (
                  <FormErrorMessage>{errors.address.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* 登録ボタン */}
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="登録中..."
                mt={2}
              >
                アカウントを登録
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

          {/* ログインリンク */}
          <Box textAlign="center">
            <Text fontSize="sm" color="gray.600">
              既にアカウントをお持ちの方は{' '}
              <Link color="brand.600" fontWeight="semibold" onClick={() => navigate('/login')}>
                ログイン
              </Link>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}
