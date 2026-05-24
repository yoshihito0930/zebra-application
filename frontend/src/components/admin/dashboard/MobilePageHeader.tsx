import { Box, Text } from '@chakra-ui/react';
import { useAuthStore } from '../../../stores/authStore';

export default function MobilePageHeader() {
  const user = useAuthStore((s) => s.user);
  const roleLabel = user?.role === 'staff' ? 'スタッフ' : '管理者';
  const userName = user?.name ?? '—';

  return (
    <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" px={4} py={3}>
      <Text fontSize="md" fontWeight="bold" color="gray.900">
        スタジオゼブラ 管理画面
      </Text>
      <Text fontSize="xs" color="gray.500" mt={0.5}>
        {roleLabel}: {userName}
      </Text>
    </Box>
  );
}
