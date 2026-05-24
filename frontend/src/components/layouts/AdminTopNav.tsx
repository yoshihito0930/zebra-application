import { useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Search, Menu as MenuIcon, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  label: string;
  path: string;
  matchPaths?: string[];
  notReady?: boolean;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: '予約管理', path: '/admin/dashboard', matchPaths: ['/admin/dashboard', '/admin/reservations', '/admin/calendar'] },
  { label: 'ブロック', path: '/admin/blocked-slots', notReady: true },
  { label: 'プラン', path: '/admin/plans', notReady: true },
  { label: '問い合わせ', path: '/admin/inquiries', notReady: true },
  { label: 'スタッフ', path: '#', disabled: true },
];

function isActive(item: NavItem, pathname: string): boolean {
  const paths = item.matchPaths ?? [item.path];
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function AdminTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  // TODO(search): バックエンド検索API実装後に配線
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleNavClick = (item: NavItem) => {
    onClose();
    if (item.disabled) return;
    if (item.notReady) {
      toast({
        title: `${item.label}は実装予定です`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    navigate(item.path);
  };

  return (
    <Box
      as="header"
      bg="white"
      borderBottom="1px"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={10}
      display={{ base: 'none', md: 'block' }}
    >
      <Flex h="64px" px={{ base: 4, md: 6 }} align="center" gap={6}>
        {/* モバイル: ハンバーガー */}
        <IconButton
          aria-label="メニューを開く"
          icon={<MenuIcon size={20} />}
          variant="ghost"
          display={{ base: 'flex', md: 'none' }}
          onClick={onOpen}
        />

        {/* ロゴ */}
        <HStack spacing={3} cursor="pointer" onClick={() => navigate('/admin/dashboard')} flexShrink={0}>
          <Box
            w="32px"
            h="32px"
            bg="brand.300"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="md" fontWeight="bold" color="white">
              SZ
            </Text>
          </Box>
          <HStack spacing={2} display={{ base: 'none', sm: 'flex' }}>
            <Text fontWeight="bold" color="gray.800">
              スタジオゼブラ
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="accent.500">
              管理画面
            </Text>
          </HStack>
        </HStack>

        {/* デスクトップ: 横並びナビ */}
        <HStack as="nav" spacing={1} display={{ base: 'none', md: 'flex' }} flex={1}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item, location.pathname);
            return (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                fontWeight={active ? 'bold' : 'medium'}
                color={active ? 'gray.900' : 'gray.600'}
                bg={active ? 'gray.100' : 'transparent'}
                isDisabled={item.disabled}
                _hover={{ bg: active ? 'gray.100' : 'gray.50' }}
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </Button>
            );
          })}
        </HStack>

        {/* 検索バー */}
        <InputGroup maxW="280px" display={{ base: 'none', lg: 'block' }}>
          <InputLeftElement pointerEvents="none">
            <Search size={16} color="#9CA3AF" />
          </InputLeftElement>
          <Input
            placeholder="予約者・会社名で検索…"
            size="sm"
            borderRadius="md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            title="検索機能は実装予定"
          />
        </InputGroup>

        {/* ユーザーメニュー */}
        <Menu>
          <MenuButton>
            <HStack spacing={2} cursor="pointer">
              <Avatar size="sm" name={user?.name} bg="gray.800" color="white" />
              <Box display={{ base: 'none', md: 'block' }} textAlign="left">
                <Text fontSize="xs" color="gray.500" lineHeight="1">
                  {user?.role === 'admin' ? '管理者' : 'スタッフ'}:
                </Text>
                <Text fontSize="sm" fontWeight="medium" lineHeight="1.2">
                  {user?.name || '管理者'}
                </Text>
              </Box>
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem icon={<User size={16} />} onClick={() => navigate('/admin/profile')}>
              プロフィール
            </MenuItem>
            <MenuItem icon={<LogOut size={16} />} onClick={handleLogout}>
              ログアウト
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* モバイル: ドロワー */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <HStack spacing={3}>
              <Box
                w="32px"
                h="32px"
                bg="brand.300"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="md" fontWeight="bold" color="white">
                  SZ
                </Text>
              </Box>
              <Heading size="sm">管理画面</Heading>
            </HStack>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={1} align="stretch">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item, location.pathname);
                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    justifyContent="flex-start"
                    fontWeight={active ? 'bold' : 'medium'}
                    color={active ? 'gray.900' : 'gray.600'}
                    bg={active ? 'gray.100' : 'transparent'}
                    isDisabled={item.disabled}
                    onClick={() => handleNavClick(item)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
