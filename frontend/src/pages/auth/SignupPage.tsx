import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

export default function SignupPage() {
  return (
    <Container maxW="container.sm" py={20}>
      <Box bg="white" p={8} borderRadius="lg" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" color="brand.600">
            新規登録
          </Heading>
          <Text color="gray.600">
            アカウントを作成してスタジオ予約を始めましょう
          </Text>
          <Text color="gray.500" fontSize="sm">
            ※ サインアップフォームは後で実装します
          </Text>
        </VStack>
      </Box>
    </Container>
  );
}
