import { Box, Container, Heading, Text, VStack, Button } from '@chakra-ui/react';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
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

        <Box bg="white" p={8} borderRadius="lg" shadow="md" minH="400px">
          <VStack spacing={4}>
            <Calendar size={48} color="#82C2A9" />
            <Text color="gray.500" fontSize="sm">
              ※ カレンダーコンポーネントは後で実装します
            </Text>
            <Button colorScheme="brand" size="lg">
              新規予約を作成
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
