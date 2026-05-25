import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import { MoreVertical } from 'lucide-react';
import type { Option } from '../../../types';

interface MobileOptionCardProps {
  option: Option;
  onEdit: (option: Option) => void;
  onToggleActive: (option: Option) => void;
}

export default function MobileOptionCard({
  option,
  onEdit,
  onToggleActive,
}: MobileOptionCardProps) {
  const isActive = option.is_active;
  const mutedColor = isActive ? undefined : 'gray.500';

  return (
    <Box
      position="relative"
      bg={isActive ? 'white' : 'gray.50'}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      pl={4}
      pr={2}
      py={3}
    >
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="5px"
        bg={isActive ? 'brand.300' : 'gray.400'}
        borderLeftRadius="lg"
      />

      <Flex justify="space-between" align="flex-start" gap={2}>
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="md" color={mutedColor ?? 'gray.900'}>
              {option.option_name}
            </Text>
            <Badge colorScheme={isActive ? 'green' : 'gray'}>
              {isActive ? '有効' : '無効'}
            </Badge>
            <Badge variant="outline" colorScheme="gray">
              #{option.display_order}
            </Badge>
          </HStack>
          <Text fontSize="sm" color={mutedColor ?? 'gray.700'} fontWeight="medium">
            ¥{option.price.toLocaleString()}（税抜・
            {Math.round(option.tax_rate * 100)}%）
          </Text>
        </VStack>

        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="アクション"
            icon={<MoreVertical size={18} />}
            size="md"
            variant="ghost"
          />
          <Portal>
            <MenuList>
              <MenuItem onClick={() => onEdit(option)}>編集</MenuItem>
              <MenuItem
                color={isActive ? 'red.600' : undefined}
                onClick={() => onToggleActive(option)}
              >
                {isActive ? '無効化する' : '再有効化する'}
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Flex>
    </Box>
  );
}
