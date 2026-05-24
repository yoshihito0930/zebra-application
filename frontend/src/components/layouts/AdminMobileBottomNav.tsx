import { Box, HStack, Icon, Text, useDisclosure, useToast } from '@chakra-ui/react';
import { Calendar, DollarSign, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminMobileMoreSheet from './AdminMobileMoreSheet';

type LucideIcon = typeof Calendar;

interface TabConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  matchPaths?: string[];
  path?: string;
  notReady?: boolean;
  isMore?: boolean;
}

const TABS: TabConfig[] = [
  {
    key: 'reservations',
    label: '予約',
    icon: Calendar,
    path: '/admin/dashboard',
    matchPaths: ['/admin/dashboard', '/admin/reservations', '/admin/calendar'],
  },
  {
    key: 'inquiries',
    label: '問い合わせ',
    icon: MessageSquare,
    path: '/admin/inquiries',
    matchPaths: ['/admin/inquiries'],
    notReady: true,
  },
  {
    key: 'revenue',
    label: '売上',
    icon: DollarSign,
    notReady: true,
  },
  {
    key: 'more',
    label: 'その他',
    icon: MoreHorizontal,
    isMore: true,
  },
];

function isTabActive(tab: TabConfig, pathname: string): boolean {
  const paths = tab.matchPaths ?? (tab.path ? [tab.path] : []);
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const moreSheet = useDisclosure();

  const handleTabClick = (tab: TabConfig) => {
    if (tab.isMore) {
      moreSheet.onOpen();
      return;
    }
    if (tab.notReady) {
      toast({
        title: `${tab.label}は実装予定です`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    if (tab.path) navigate(tab.path);
  };

  return (
    <>
      <Box
        as="nav"
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={20}
        bg="white"
        borderTopWidth="1px"
        borderColor="gray.200"
        pb="env(safe-area-inset-bottom)"
        display={{ base: 'flex', md: 'none' }}
      >
        <HStack as="ul" spacing={0} w="full" h="64px" listStyleType="none">
          {TABS.map((tab) => {
            const active = isTabActive(tab, location.pathname);
            const color = active ? 'green.500' : 'gray.500';
            return (
              <Box
                key={tab.key}
                as="li"
                flex={1}
                h="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  as="button"
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  gap={1}
                  w="full"
                  h="full"
                  color={color}
                  fontWeight={active ? 'bold' : 'medium'}
                  transition="color 0.15s"
                >
                  <Icon as={tab.icon} boxSize={5} />
                  <Text fontSize="11px">{tab.label}</Text>
                </Box>
              </Box>
            );
          })}
        </HStack>
      </Box>

      <AdminMobileMoreSheet isOpen={moreSheet.isOpen} onClose={moreSheet.onClose} />
    </>
  );
}
