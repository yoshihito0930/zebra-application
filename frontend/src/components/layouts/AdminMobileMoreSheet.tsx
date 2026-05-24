import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  Ban,
  ChevronRight,
  LogOut,
  Package,
  User,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

type LucideIcon = typeof User;

interface MoreItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  notReady?: boolean;
  disabled?: boolean;
  action?: 'logout';
  danger?: boolean;
}

const ITEMS: MoreItem[] = [
  { key: 'blocked-slots', label: 'ブロック枠', icon: Ban, notReady: true },
  { key: 'plans', label: 'プラン', icon: Package, notReady: true },
  { key: 'staff', label: 'スタッフ', icon: Users, disabled: true },
  { key: 'profile', label: 'プロフィール', icon: User, path: '/admin/profile' },
  { key: 'logout', label: 'ログアウト', icon: LogOut, action: 'logout', danger: true },
];

interface AdminMobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMobileMoreSheet({ isOpen, onClose }: AdminMobileMoreSheetProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleClick = (item: MoreItem) => {
    if (item.disabled) {
      toast({ title: `${item.label}は近日公開予定です`, status: 'info', duration: 2000 });
      return;
    }
    if (item.notReady) {
      toast({ title: `${item.label}は実装予定です`, status: 'info', duration: 2000 });
      return;
    }
    if (item.action === 'logout') {
      clearAuth();
      onClose();
      navigate('/login');
      return;
    }
    if (item.path) {
      onClose();
      navigate(item.path);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
      <DrawerOverlay />
      <DrawerContent borderTopRadius="2xl" pb="env(safe-area-inset-bottom)">
        <DrawerCloseButton />
        <DrawerHeader fontSize="md">その他</DrawerHeader>
        <DrawerBody pb={6}>
          <VStack spacing={1} align="stretch">
            {ITEMS.map((item) => (
              <Box
                key={item.key}
                as="button"
                type="button"
                onClick={() => handleClick(item)}
                w="full"
                textAlign="left"
                px={3}
                py={3}
                borderRadius="md"
                _hover={{ bg: 'gray.50' }}
                _active={{ bg: 'gray.100' }}
                opacity={item.disabled ? 0.5 : 1}
              >
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Icon
                      as={item.icon}
                      boxSize={5}
                      color={item.danger ? 'red.500' : 'gray.600'}
                    />
                    <Text
                      fontWeight="medium"
                      color={item.danger ? 'red.500' : 'gray.800'}
                    >
                      {item.label}
                    </Text>
                  </HStack>
                  <Icon as={ChevronRight} boxSize={4} color="gray.400" />
                </HStack>
              </Box>
            ))}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
