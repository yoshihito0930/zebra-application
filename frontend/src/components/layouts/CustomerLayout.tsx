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
  VStack,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Divider,
  Tag,
  TagLabel,
  TagLeftIcon,
} from '@chakra-ui/react';
import { Bell, List, MessageCircle, MoreHorizontal, User, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LogoutButton from '../auth/LogoutButton';

interface CustomerLayoutProps {
  children: ReactNode;
  breadcrumbLabel?: string;
}

export default function CustomerLayout({
  children,
  breadcrumbLabel = '予約',
}: CustomerLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleDrawerNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* ヘッダー (共通) */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" shadow="sm">
        <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
          <Flex h="64px" align="center" justify="space-between">
            {/* ロゴ + パンくず */}
            <HStack spacing={{ base: 2, md: 4 }} minW={0}>
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
                flexShrink={0}
              >
                <Text fontSize="lg" fontWeight="bold" color="white">
                  SZ
                </Text>
              </Box>
              <Breadcrumb separator="/" fontSize={{ base: 'sm', md: 'md' }} color="gray.700">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    color="brand.600"
                    fontWeight="semibold"
                    onClick={() => navigate('/customer/calendar')}
                    _hover={{ textDecoration: 'underline' }}
                    whiteSpace="nowrap"
                  >
                    スタジオゼブラ
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <Text color="gray.700" whiteSpace="nowrap">
                    {breadcrumbLabel}
                  </Text>
                </BreadcrumbItem>
              </Breadcrumb>
            </HStack>

            {/* 右側エリア — デスクトップ (md+) */}
            <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
              {isAuthenticated ? (
                <>
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
                        <Text fontSize="sm" fontWeight="medium">
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

            {/* 右側エリア — モバイル (<md) */}
            <Box display={{ base: 'block', md: 'none' }}>
              {isAuthenticated ? (
                <IconButton
                  aria-label="メニュー"
                  icon={<MoreHorizontal size={20} />}
                  isRound
                  variant="ghost"
                  size="md"
                  onClick={onOpen}
                />
              ) : (
                <Tag
                  size="md"
                  borderRadius="full"
                  variant="subtle"
                  colorScheme="gray"
                  cursor="pointer"
                  onClick={onOpen}
                  py={1.5}
                  px={3}
                >
                  <TagLeftIcon as={UserCircle2} boxSize="14px" />
                  <TagLabel fontSize="xs" fontWeight="semibold">
                    ゲスト
                  </TagLabel>
                </Tag>
              )}
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* メインコンテンツ */}
      <Box as="main" py={{ base: 4, md: 8 }}>
        {children}
      </Box>

      {/* フッター (md+ のみ) */}
      <Box
        display={{ base: 'none', md: 'block' }}
        bg="white"
        borderTop="1px"
        borderColor="gray.200"
        py={6}
        mt="auto"
      >
        <Container maxW="container.xl">
          <Text fontSize="sm" color="gray.500" textAlign="center">
            © 2026 Studio Zebra. All rights reserved.
          </Text>
        </Container>
      </Box>

      {/* モバイル用 Drawer メニュー */}
      <Drawer placement="right" isOpen={isOpen} onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">メニュー</DrawerHeader>
          <DrawerBody p={0}>
            <VStack align="stretch" spacing={0} py={2}>
              {isAuthenticated ? (
                <>
                  <HStack px={4} py={3} spacing={3}>
                    <Avatar size="sm" name={user?.name} bg="brand.300" />
                    <Text fontSize="sm" fontWeight="medium">
                      {user?.name}
                    </Text>
                  </HStack>
                  <Divider />
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<List size={16} />}
                    borderRadius={0}
                    py={6}
                    onClick={() => handleDrawerNavigate('/customer/reservations')}
                  >
                    マイ予約
                  </Button>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<MessageCircle size={16} />}
                    borderRadius={0}
                    py={6}
                    onClick={() => handleDrawerNavigate('/customer/inquiries')}
                  >
                    問い合わせ
                  </Button>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<User size={16} />}
                    borderRadius={0}
                    py={6}
                    onClick={() => handleDrawerNavigate('/customer/profile')}
                  >
                    プロフィール
                  </Button>
                  <Divider />
                  <Box px={4} py={3}>
                    <LogoutButton variant="button" size="sm" />
                  </Box>
                </>
              ) : (
                <>
                  <HStack px={4} py={3} spacing={3}>
                    <UserCircle2 size={20} />
                    <Text fontSize="sm" color="gray.700">
                      ゲストとして閲覧中
                    </Text>
                  </HStack>
                  <Divider />
                  <VStack align="stretch" spacing={2} px={4} py={3}>
                    <Button
                      colorScheme="brand"
                      onClick={() => handleDrawerNavigate('/login')}
                    >
                      ログイン
                    </Button>
                    <Button
                      variant="outline"
                      colorScheme="brand"
                      onClick={() => handleDrawerNavigate('/signup')}
                    >
                      新規登録
                    </Button>
                  </VStack>
                </>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
