import { Box, Stat, StatLabel, StatNumber, StatHelpText, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export type KpiTone = 'success' | 'warning' | 'neutral' | 'accent';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  subText?: string;
  subTextTone?: 'positive' | 'negative' | 'neutral';
  tone?: KpiTone;
  accentDot?: boolean;
  onClick?: () => void;
}

const valueColor: Record<KpiTone, string> = {
  success: 'green.500',
  warning: 'orange.500',
  neutral: 'gray.800',
  accent: 'accent.500',
};

const borderColor: Record<KpiTone, string> = {
  success: 'gray.200',
  warning: 'orange.300',
  neutral: 'gray.200',
  accent: 'accent.300',
};

const bgColor: Record<KpiTone, string> = {
  success: 'white',
  warning: 'orange.50',
  neutral: 'white',
  accent: 'white',
};

const subTone: Record<NonNullable<KpiCardProps['subTextTone']>, string> = {
  positive: 'green.600',
  negative: 'red.600',
  neutral: 'gray.500',
};

export default function KpiCard({
  label,
  value,
  unit,
  subText,
  subTextTone = 'neutral',
  tone = 'neutral',
  accentDot = false,
  onClick,
}: KpiCardProps) {
  return (
    <Box
      bg={bgColor[tone]}
      borderWidth="2px"
      borderColor={borderColor[tone]}
      borderRadius="lg"
      p={5}
      position="relative"
      cursor={onClick ? 'pointer' : 'default'}
      transition="all 0.2s"
      _hover={onClick ? { shadow: 'md', transform: 'translateY(-1px)' } : undefined}
      onClick={onClick}
    >
      {accentDot && (
        <Box
          position="absolute"
          top={3}
          right={3}
          w="8px"
          h="8px"
          bg="orange.400"
          borderRadius="full"
        />
      )}
      <Stat>
        <StatLabel color="gray.600" fontSize="sm">
          {label}
        </StatLabel>
        <Flex align="baseline" gap={1} mt={1}>
          <StatNumber color={valueColor[tone]} fontSize="3xl">
            {value}
          </StatNumber>
          {unit && (
            <Box as="span" fontSize="sm" color="gray.500" fontWeight="medium">
              {unit}
            </Box>
          )}
        </Flex>
        {subText && (
          <StatHelpText color={subTone[subTextTone]} fontSize="xs" mb={0} mt={1}>
            {subText}
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
}
