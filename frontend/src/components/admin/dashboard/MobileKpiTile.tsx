import type { ReactNode } from 'react';
import { Box, Text } from '@chakra-ui/react';

interface MobileKpiTileProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
}

export default function MobileKpiTile({ label, value, valueColor = 'gray.900' }: MobileKpiTileProps) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      px={3}
      py={3}
      minH="76px"
    >
      <Text fontSize="xs" color="gray.500" lineHeight="1.2">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={valueColor} lineHeight="1.1" mt={1}>
        {value}
      </Text>
    </Box>
  );
}
