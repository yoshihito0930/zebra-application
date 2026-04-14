import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

export default function LoginPage() {
  return (
    <Container maxW="container.sm" py={20}>
      <Box bg="white" p={8} borderRadius="lg" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" color="brand.600">
            ログイン
          </Heading>
          <Text color="gray.600">
            スタジオゼブラ予約管理システムへようこそ
          </Text>
          <Text color="gray.500" fontSize="sm">
            ※ ログインフォームは後で実装します
          </Text>
        </VStack>
      </Box>
    </Container>
  );
}
