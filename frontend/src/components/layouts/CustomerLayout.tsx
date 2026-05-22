import type { ReactNode } from 'react';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Container,
  Flex,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Text,
  HStack,
} from '@chakra-ui/react';
import { Bell, List, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LogoutButton from '../auth/LogoutButton';

interface CustomerLayoutProps {
  children: ReactNode;
  breadcrumbLabel?: string;
}

export default function CustomerLayout({ children, breadcrumbLabel = '予約' }: CustomerLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* ヘッダー */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" shadow="sm">
        <Container maxW="container.xl">
          <Flex h="64px" align="center" justify="space-between">
            {/* ロゴ + パンくず */}
            <HStack spacing={4}>
              <Box
                w="40px"
                h="40px"
                bg="brand.300"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onClick={() => navigate('/customer/calendar')}
              >
                <Text fontSize="lg" fontWeight="bold" color="white">
                  SZ
                </Text>
              </Box>
              <Breadcrumb separator="/" fontSize="md" color="gray.700">
                <BreadcrumbItem display={{ base: 'none', md: 'flex' }}>
                  <BreadcrumbLink
                    color="brand.600"
                    fontWeight="semibold"
                    onClick={() => navigate('/customer/calendar')}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    スタジオゼブラ
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <Text color="gray.700">{breadcrumbLabel}</Text>
                </BreadcrumbItem>
              </Breadcrumb>
            </HStack>

            {/* 右側エリア */}
            <HStack spacing={3}>
              {isAuthenticated ? (
                <>
                  {/* TODO: 通知機能は別タスクで実装予定 */}
                  <IconButton
                    aria-label="通知"
                    icon={<Bell size={18} />}
                    variant="ghost"
                    size="md"
                  />

                  <Menu>
                    <MenuButton>
                      <HStack spacing={2} cursor="pointer">
                        <Avatar size="sm" name={user?.name} bg="brand.300" />
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          display={{ base: 'none', md: 'block' }}
                        >
                          {user?.name}
                        </Text>
                      </HStack>
                    </MenuButton>
                    <MenuList>
                      <MenuItem
                        icon={<List size={16} />}
                        onClick={() => navigate('/customer/reservations')}
                      >
                        予約一覧
                      </MenuItem>
                      <MenuItem
                        icon={<MessageCircle size={16} />}
                        onClick={() => navigate('/customer/inquiries')}
                      >
                        問い合わせ
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem
                        icon={<User size={16} />}
                        onClick={() => navigate('/customer/profile')}
                      >
                        プロフィール
                      </MenuItem>
                      <Box px={3} py={2}>
                        <LogoutButton variant="button" size="sm" />
                      </Box>
                    </MenuList>
                  </Menu>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    colorScheme="brand"
                    size="sm"
                    onClick={() => navigate('/login')}
                  >
                    ログイン
                  </Button>
                  <Button
                    colorScheme="brand"
                    size="sm"
                    onClick={() => navigate('/signup')}
                  >
                    新規登録
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* メインコンテンツ */}
      <Box as="main" py={8}>
        {children}
      </Box>

      {/* フッター */}
      <Box bg="white" borderTop="1px" borderColor="gray.200" py={6} mt="auto">
        <Container maxW="container.xl">
          <Text fontSize="sm" color="gray.500" textAlign="center">
            © 2026 Studio Zebra. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
