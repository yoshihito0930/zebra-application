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
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

interface VerifyFormData {
  code: string;
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const { confirmSignup, resendConfirmationCode, isLoading, error, clearError } = useAuth();
  const [resendSuccess, setResendSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>();

  const onSubmit = async (data: VerifyFormData) => {
    try {
      await confirmSignup(email, data.code);
      // 成功時は useAuth 内でログイン画面にリダイレクトされる
    } catch {
      // エラーは useAuth で管理される
    }
  };

  const handleResendCode = async () => {
    setResendSuccess(false);
    clearError();

    try {
      await resendConfirmationCode(email);
      setResendSuccess(true);
    } catch {
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
          <Button colorScheme="brand" onClick={() => navigate('/signup')}>
            サインアップへ戻る
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
                ✉
              </Text>
            </Box>
            <Heading size="lg" color="brand.600" mb={2}>
              メールアドレスの検証
            </Heading>
            <Text color="gray.600" fontSize="sm">
              {email} に送信された検証コードを入力してください
            </Text>
          </Box>

          {/* 成功メッセージ */}
          {resendSuccess && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                検証コードを再送信しました
              </AlertDescription>
            </Alert>
          )}

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
                  placeholder="6桁のコード"
                  maxLength={6}
                  {...register('code', {
                    required: '検証コードを入力してください',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: '6桁の数字を入力してください',
                    },
                  })}
                />
                {errors.code && (
                  <FormErrorMessage>{errors.code.message}</FormErrorMessage>
                )}
              </FormControl>

              {/* 検証ボタン */}
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="検証中..."
              >
                メールアドレスを検証
              </Button>
            </VStack>
          </form>

          {/* コード再送 */}
          <Box textAlign="center">
            <Text fontSize="sm" color="gray.600" mb={2}>
              コードが届いていない場合は
            </Text>
            <Link
              color="brand.600"
              fontWeight="semibold"
              onClick={handleResendCode}
              fontSize="sm"
            >
              検証コードを再送信
            </Link>
          </Box>

          {/* ログインリンク */}
          <Box textAlign="center" pt={2} borderTop="1px solid" borderColor="gray.200">
            <Text fontSize="sm" color="gray.600">
              既にアカウントを検証済みの方は{' '}
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
