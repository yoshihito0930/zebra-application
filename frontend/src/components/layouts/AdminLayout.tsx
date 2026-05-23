import type { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import AdminTopNav from './AdminTopNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <AdminTopNav />
      <Box as="main" flex={1} px={{ base: 4, md: 6 }} py={6} overflowY="auto">
        {children}
      </Box>
    </Flex>
  );
}
