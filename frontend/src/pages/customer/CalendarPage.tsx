import { Box, Container, Heading, Text, VStack, Button, Alert, AlertIcon, HStack } from '@chakra-ui/react';
import { Calendar, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            予約カレンダー
          </Heading>
          <Text color="gray.600">
            スタジオの空き状況を確認して予約を作成できます
          </Text>
        </Box>

        {/* ゲストユーザー向け案内 */}
        {!isAuthenticated && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <VStack align="flex-start" spacing={2} flex={1}>
              <Text fontWeight="semibold">予約を作成するにはログインが必要です</Text>
              <Text fontSize="sm">
                カレンダーは閲覧可能です。予約を作成する場合は、ログインまたは新規登録してください。
              </Text>
              <HStack spacing={3} mt={2}>
                <Button
                  size="sm"
                  leftIcon={<LogIn size={16} />}
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => navigate('/login')}
                >
                  ログイン
                </Button>
                <Button
                  size="sm"
                  leftIcon={<UserPlus size={16} />}
                  colorScheme="blue"
                  onClick={() => navigate('/signup')}
                >
                  新規登録
                </Button>
              </HStack>
            </VStack>
          </Alert>
        )}

        <Box bg="white" p={8} borderRadius="lg" shadow="md" minH="400px">
          <VStack spacing={4}>
            <Calendar size={48} color="#82C2A9" />
            <Text color="gray.500" fontSize="sm">
              ※ カレンダーコンポーネントは後で実装します
            </Text>
            {isAuthenticated ? (
              <Button colorScheme="brand" size="lg">
                新規予約を作成
              </Button>
            ) : (
              <Button
                colorScheme="brand"
                size="lg"
                onClick={() => navigate('/login')}
              >
                ログインして予約を作成
              </Button>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
