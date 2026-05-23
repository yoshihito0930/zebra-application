import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UrgentAlertCardProps {
  pendingCount: number;
}

export default function UrgentAlertCard({ pendingCount }: UrgentAlertCardProps) {
  const navigate = useNavigate();
  if (pendingCount === 0) return null;

  return (
    <Box bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="lg" p={4}>
      <VStack align="stretch" spacing={3}>
        <HStack spacing={2} color="red.600">
          <AlertTriangle size={18} />
          <Text fontWeight="bold" fontSize="sm">
            要対応
          </Text>
        </HStack>
        <Box>
          <Text fontSize="sm" color="gray.800">
            <Text as="span" fontWeight="bold">
              {pendingCount}件
            </Text>
            の予約申請が承認待ちです。
          </Text>
          <Text fontSize="xs" color="gray.600" mt={1}>
            早めの対応をおすすめします。
          </Text>
        </Box>
        <Button
          size="sm"
          colorScheme="red"
          variant="solid"
          onClick={() => navigate('/admin/reservations?status=pending')}
        >
          承認待ち一覧へ →
        </Button>
      </VStack>
    </Box>
  );
}
