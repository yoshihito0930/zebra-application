import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useAuthStore } from '../../../stores/authStore';

export default function MobilePageHeader() {
  const user = useAuthStore((s) => s.user);
  const roleLabel = user?.role === 'staff' ? 'スタッフ' : '管理者';
  const userName = user?.name ?? '—';

  return (
    <VStack align="stretch" spacing={3}>
      {/* グレー背景の上に置かれる大見出し */}
      <Box pt={1} pb={1}>
        <Heading
          fontSize="4xl"
          fontWeight="black"
          color="gray.900"
          letterSpacing="tight"
          lineHeight="1.1"
        >
          管理
        </Heading>
      </Box>

      {/* 白パネル: スタジオ名 + 担当者 */}
      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" px={4} py={3}>
        <Text fontSize="md" fontWeight="bold" color="gray.900">
          スタジオゼブラ 管理画面
        </Text>
        <Text fontSize="xs" color="gray.500" mt={0.5}>
          {roleLabel}: {userName}
        </Text>
      </Box>
    </VStack>
  );
}
