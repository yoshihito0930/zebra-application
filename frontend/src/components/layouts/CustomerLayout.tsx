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
  Heading,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Divider,
} from '@chakra-ui/react';
import { Bell, ChevronLeft, List, MessageCircle, MoreHorizontal, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LogoutButton from '../auth/LogoutButton';

interface CustomerLayoutProps {
  children: ReactNode;
  breadcrumbLabel?: string;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function CustomerLayout({
  children,
  breadcrumbLabel = '予約',
  title = '',
  showBack = true,
  onBack,
}: CustomerLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleBack = onBack ?? (() => navigate(-1));

  const handleDrawerNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* デスクトップヘッダー (md+) */}
      <Box
        display={{ base: 'none', md: 'block' }}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        shadow="sm"
      >
        <Container maxW="container.xl">
          <Flex h="64px" align="center" justify="space-between">
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

            <HStack spacing={3}>
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

      {/* モバイル chrome (<md) */}
      <Box display={{ base: 'block', md: 'none' }} bg="gray.100" px={4} pt={3} pb={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <IconButton
            aria-label="戻る"
            icon={<ChevronLeft size={20} />}
            isRound
            bg="white"
            shadow="sm"
            size="md"
            visibility={showBack ? 'visible' : 'hidden'}
            onClick={handleBack}
          />
          <IconButton
            aria-label="メニュー"
            icon={<MoreHorizontal size={20} />}
            isRound
            bg="white"
            shadow="sm"
            size="md"
            onClick={onOpen}
          />
        </Flex>
        {title && (
          <Heading size="xl" fontWeight="bold" color="gray.900">
            {title}
          </Heading>
        )}
      </Box>

      {/* メインコンテンツ */}
      <Box as="main" py={{ base: 0, md: 8 }}>{children}</Box>

      {/* デスクトップフッター (md+) */}
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
                <VStack align="stretch" spacing={2} px={4} py={2}>
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
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
