import { Box, Container, Heading, Text, VStack, SimpleGrid, Stat, StatLabel, StatNumber, Button, HStack } from '@chakra-ui/react';
import { Calendar, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

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
          <Box
            bg="white"
            p={6}
            borderRadius="lg"
            shadow="md"
            cursor="pointer"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
            onClick={() => navigate('/admin/reservations?status=pending')}
          >
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
          <HStack spacing={4}>
            <Button
              leftIcon={<Calendar size={18} />}
              colorScheme="brand"
              onClick={() => navigate('/admin/reservations')}
            >
              全予約を見る
            </Button>
            <Button
              leftIcon={<CheckCircle size={18} />}
              colorScheme="orange"
              variant="outline"
              onClick={() => navigate('/admin/reservations?status=pending')}
            >
              承認待ちを見る
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Container>
  );
}
