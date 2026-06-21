import type { ReactNode } from 'react';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Container,
  Flex,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import { TicketCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerLayoutProps {
  children: ReactNode;
  breadcrumbLabel?: string;
}

/**
 * 公開予約画面の共通レイアウト。
 * 会員/ゲストの区別を撤廃したため、ログイン不要・認証分岐なしのシンプルなヘッダーにしている。
 * 利用者が自分の予約を確認できるよう「予約を確認」導線（トークン入力ページ）のみ用意する。
 */
export default function CustomerLayout({
  children,
  breadcrumbLabel = '予約',
}: CustomerLayoutProps) {
  const navigate = useNavigate();

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

            {/* 右側エリア — 予約確認導線（トークン入力ページ） */}
            <Button
              variant="outline"
              colorScheme="brand"
              size="sm"
              leftIcon={<TicketCheck size={16} />}
              onClick={() => navigate('/reservations/guest/verify')}
            >
              予約を確認
            </Button>
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
    </Box>
  );
}
