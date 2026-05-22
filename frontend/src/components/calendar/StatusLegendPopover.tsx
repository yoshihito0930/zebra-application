import {
  Box,
  HStack,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  VStack,
} from '@chakra-ui/react';
import { HelpCircle } from 'lucide-react';

interface LegendItem {
  label: string;
  bg: string;
  border: string;
  text: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { label: '本予約', bg: 'green.100', border: 'green.500', text: 'green.800' },
  { label: '仮予約', bg: 'orange.100', border: 'orange.500', text: 'orange.800' },
  { label: '第2キープ', bg: 'purple.100', border: 'purple.500', text: 'purple.800' },
  { label: 'ロケハン', bg: 'blue.100', border: 'blue.500', text: 'blue.800' },
  { label: '承認待ち', bg: 'brand.50', border: 'brand.300', text: 'brand.700' },
];

export default function StatusLegendPopover() {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <IconButton
          aria-label="ステータス凡例を表示"
          icon={<HelpCircle size={16} />}
          variant="ghost"
          size="sm"
        />
      </PopoverTrigger>
      <PopoverContent width="220px">
        <PopoverArrow />
        <PopoverHeader fontSize="sm" fontWeight="semibold">
          予約ステータス
        </PopoverHeader>
        <PopoverBody>
          <VStack align="stretch" spacing={2}>
            {LEGEND_ITEMS.map((item) => (
              <HStack key={item.label} spacing={2}>
                <Box
                  bg={item.bg}
                  borderLeftWidth="4px"
                  borderLeftColor={item.border}
                  px={2}
                  py={1}
                  borderRadius="sm"
                  flex={1}
                >
                  <Text fontSize="xs" fontWeight="semibold" color={item.text}>
                    {item.label}
                  </Text>
                </Box>
              </HStack>
            ))}
            <HStack spacing={2}>
              <Box bg="gray.300" px={2} py={1} borderRadius="sm" flex={1}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                  休業日
                </Text>
              </Box>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
