import type { ReactNode } from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  VStack,
  HStack,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Calendar,
  LogOut,
  User,
  LayoutDashboard,
  Menu as MenuIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface StaffLayoutProps {
  children: ReactNode;
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      justifyContent="flex-start"
      leftIcon={icon as React.ReactElement}
      w="full"
      bg={isActive ? 'brand.50' : 'transparent'}
      color={isActive ? 'brand.600' : 'gray.700'}
      _hover={{
        bg: isActive ? 'brand.50' : 'gray.100',
      }}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

interface SidebarContentProps {
  navItems: Array<{ icon: ReactNode; label: string; path: string }>;
  currentPath: string;
  onNavigate: (path: string) => void;
}

function SidebarContent({ navItems, currentPath, onNavigate }: SidebarContentProps) {
  return (
    <VStack spacing={2} align="stretch">
      {navItems.map((item) => (
        <NavItem
          key={item.path}
          icon={item.icon}
          label={item.label}
          path={item.path}
          isActive={currentPath === item.path}
          onClick={() => onNavigate(item.path)}
        />
      ))}
    </VStack>
  );
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'ダッシュボード', path: '/staff/dashboard' },
    { icon: <Calendar size={18} />, label: '予約管理', path: '/staff/reservations' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* サイドバー（デスクトップ） */}
      <Box
        w="250px"
        bg="white"
        borderRight="1px"
        borderColor="gray.200"
        p={6}
        display={{ base: 'none', md: 'block' }}
      >
        {/* ロゴ */}
        <HStack spacing={3} mb={8} cursor="pointer" onClick={() => navigate('/staff/dashboard')}>
          <Box w="40px" h="40px" bg="brand.300" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="xl" fontWeight="bold" color="white">
              Z
            </Text>
          </Box>
          <Heading size="sm" color="brand.600">
            スタッフ画面
          </Heading>
        </HStack>

        {/* ナビゲーション */}
        <SidebarContent navItems={navItems} currentPath={location.pathname} onNavigate={handleNavigate} />
      </Box>

      {/* モバイル用サイドバー（ドロワー） */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <HStack spacing={3}>
              <Box w="40px" h="40px" bg="brand.300" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                <Text fontSize="xl" fontWeight="bold" color="white">
                  Z
                </Text>
              </Box>
              <Heading size="sm" color="brand.600">
                スタッフ画面
              </Heading>
            </HStack>
          </DrawerHeader>
          <DrawerBody>
            <SidebarContent navItems={navItems} currentPath={location.pathname} onNavigate={handleNavigate} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* メインコンテンツエリア */}
      <Flex flex={1} direction="column">
        {/* ヘッダー */}
        <Box bg="white" borderBottom="1px" borderColor="gray.200" shadow="sm">
          <Flex h="64px" px={6} align="center" justify="space-between">
            {/* モバイルメニューボタン */}
            <IconButton
              aria-label="メニューを開く"
              icon={<MenuIcon />}
              variant="ghost"
              display={{ base: 'flex', md: 'none' }}
              onClick={onOpen}
            />

            <Box flex={1} />

            {/* ユーザーメニュー */}
            <Menu>
              <MenuButton>
                <HStack spacing={2} cursor="pointer">
                  <Avatar size="sm" name={user?.name} bg="accent.400" />
                  <Box display={{ base: 'none', sm: 'block' }}>
                    <Text fontSize="sm" fontWeight="medium">
                      {user?.name || 'スタッフ'}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      スタッフ
                    </Text>
                  </Box>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<User size={18} />} onClick={() => navigate('/staff/profile')}>
                  プロフィール
                </MenuItem>
                <MenuItem icon={<LogOut size={18} />} onClick={handleLogout}>
                  ログアウト
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Box>

        {/* メインコンテンツ */}
        <Box as="main" flex={1} p={6} overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
