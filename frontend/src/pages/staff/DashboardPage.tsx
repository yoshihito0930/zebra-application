import { Box, Container, Heading, Text, VStack, SimpleGrid, Stat, StatLabel, StatNumber, Button, HStack } from '@chakra-ui/react';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="xl" color="brand.600" mb={2}>
            スタッフダッシュボード
          </Heading>
          <Text color="gray.600">
            予約の確認ができます
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
              <StatNumber color="orange.500">3件</StatNumber>
            </Stat>
          </Box>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Stat>
              <StatLabel color="gray.600">今月の予約</StatLabel>
              <StatNumber color="brand.600">45件</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        <Box bg="white" p={8} borderRadius="lg" shadow="md">
          <Heading size="md" mb={4}>
            クイックアクション
          </Heading>
          <HStack spacing={4} flexWrap="wrap">
            <Button
              leftIcon={<Calendar size={18} />}
              colorScheme="brand"
              onClick={() => navigate('/staff/calendar')}
            >
              カレンダーを見る
            </Button>
            <Button
              leftIcon={<Calendar size={18} />}
              colorScheme="brand"
              variant="outline"
              onClick={() => navigate('/staff/reservations')}
            >
              全予約を見る
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Container>
  );
}
