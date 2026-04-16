import type { ReactNode } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  HStack,
} from '@chakra-ui/react';
import { Calendar, LogOut, User, MessageCircle, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface CustomerLayoutProps {
  children: ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* ヘッダー */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" shadow="sm">
        <Container maxW="container.xl">
          <Flex h="64px" align="center" justify="space-between">
            {/* ロゴ */}
            <HStack spacing={3} cursor="pointer" onClick={() => navigate('/customer/calendar')}>
              <Box w="40px" h="40px" bg="brand.300" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                <Text fontSize="xl" fontWeight="bold" color="white">
                  Z
                </Text>
              </Box>
              <Heading size="md" color="brand.600">
                スタジオゼブラ
              </Heading>
            </HStack>

            {/* ナビゲーション */}
            <HStack spacing={6}>
              <Button
                variant="ghost"
                leftIcon={<Calendar size={18} />}
                onClick={() => navigate('/customer/calendar')}
              >
                予約カレンダー
              </Button>

              {/* ログイン状態に応じた表示 */}
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    leftIcon={<List size={18} />}
                    onClick={() => navigate('/customer/reservations')}
                  >
                    予約一覧
                  </Button>

                  <Button
                    variant="ghost"
                    leftIcon={<MessageCircle size={18} />}
                    onClick={() => navigate('/customer/inquiries')}
                  >
                    問い合わせ
                  </Button>

                  {/* ユーザーメニュー */}
                  <Menu>
                    <MenuButton>
                      <HStack spacing={2} cursor="pointer">
                        <Avatar size="sm" name={user?.name} bg="brand.300" />
                        <Text fontSize="sm" fontWeight="medium">
                          {user?.name}
                        </Text>
                      </HStack>
                    </MenuButton>
                    <MenuList>
                      <MenuItem icon={<User size={18} />} onClick={() => navigate('/customer/profile')}>
                        プロフィール
                      </MenuItem>
                      <MenuItem icon={<LogOut size={18} />} onClick={handleLogout}>
                        ログアウト
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </>
              ) : (
                <>
                  {/* ゲストユーザー向けボタン */}
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
