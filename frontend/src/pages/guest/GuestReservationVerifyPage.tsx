import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'トークンを入力してください'),
});

type VerifyTokenFormData = z.infer<typeof verifyTokenSchema>;

export default function GuestReservationVerifyPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyTokenFormData>({
    resolver: zodResolver(verifyTokenSchema),
  });

  const onSubmit = async (data: VerifyTokenFormData) => {
    setIsSubmitting(true);
    try {
      // トークンを使って予約詳細ページへ遷移
      navigate(`/reservations/guest/${data.token.trim()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxW="container.sm" py={12}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" color="brand.600" mb={3}>
            予約確認
          </Heading>
          <Text color="gray.600">
            予約確認メールに記載されているトークンを入力してください
          </Text>
        </Box>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">トークンについて</AlertTitle>
            <AlertDescription fontSize="xs">
              予約完了時に送信されたメールに記載されている確認用トークンを入力してください。
              トークンは「guest_」で始まる長い文字列です。
            </AlertDescription>
          </Box>
        </Alert>

        <Box bg="white" p={8} borderRadius="lg" shadow="md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={6} align="stretch">
              <FormControl isInvalid={!!errors.token}>
                <FormLabel>予約確認トークン</FormLabel>
                <Input
                  placeholder="guest_1234567890_abcdefgh"
                  size="lg"
                  {...register('token')}
                />
                <FormErrorMessage>{errors.token?.message}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                isLoading={isSubmitting}
                loadingText="確認中..."
              >
                予約を確認
              </Button>
            </VStack>
          </form>
        </Box>

        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600" mb={2}>
            メールが届いていない場合
          </Text>
          <Text fontSize="xs" color="gray.500">
            迷惑メールフォルダをご確認いただくか、スタジオまでお問い合わせください。
          </Text>
        </Box>

        <Button variant="outline" onClick={() => navigate('/customer/calendar')}>
          カレンダーに戻る
        </Button>
      </VStack>
    </Container>
  );
}
