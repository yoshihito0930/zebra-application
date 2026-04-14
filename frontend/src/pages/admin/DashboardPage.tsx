import { Box, Container, Heading, Text, VStack, SimpleGrid, Stat, StatLabel, StatNumber } from '@chakra-ui/react';

export default function DashboardPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            管理ダッシュボード
          </Heading>
          <Text color="gray.600">
            予約の管理・承認を行います
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">今日の予約</StatLabel>
              <StatNumber color="brand.600">3件</StatNumber>
            </Stat>
          </Box>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">承認待ち</StatLabel>
              <StatNumber color="orange.500">2件</StatNumber>
            </Stat>
          </Box>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">今月の予約</StatLabel>
              <StatNumber color="brand.600">45件</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box bg="white" p={8} borderRadius="lg" shadow="md" minH="400px">
          <Text color="gray.500" fontSize="sm" textAlign="center" mt={8}>
            ※ 予約一覧・カレンダーは後で実装します
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
