import type { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import AdminTopNav from './AdminTopNav';
import AdminMobileBottomNav from './AdminMobileBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <AdminTopNav />
      <Box
        as="main"
        flex={1}
        px={{ base: 4, md: 6 }}
        pt={{ base: 4, md: 6 }}
        pb={{ base: '88px', md: 6 }}
        overflowY="auto"
      >
        {children}
      </Box>
      <AdminMobileBottomNav />
    </Flex>
  );
}
