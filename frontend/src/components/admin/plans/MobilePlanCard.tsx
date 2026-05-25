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
  Text,
  VStack,
} from '@chakra-ui/react';
import { MoreVertical } from 'lucide-react';
import type { Plan } from '../../../types';

interface MobilePlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
}

export default function MobilePlanCard({
  plan,
  onEdit,
  onToggleActive,
}: MobilePlanCardProps) {
  const isActive = plan.is_active;

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
      overflow="hidden"
      opacity={isActive ? 1 : 0.75}
    >
      {/* 左端ストライプ */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="5px"
        bg={isActive ? 'brand.300' : 'gray.400'}
      />

      <Flex justify="space-between" align="flex-start" gap={2}>
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="md" color="gray.900">
              {plan.plan_name}
            </Text>
            <Badge colorScheme={isActive ? 'green' : 'gray'}>
              {isActive ? '有効' : '無効'}
            </Badge>
            <Badge variant="outline" colorScheme="gray">
              #{plan.display_order}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.700" fontWeight="medium">
            ¥{plan.price.toLocaleString()}（税抜・
            {Math.round(plan.tax_rate * 100)}%）
          </Text>
          {plan.description && (
            <Text fontSize="sm" color="gray.600" noOfLines={2}>
              {plan.description}
            </Text>
          )}
        </VStack>

        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="アクション"
            icon={<MoreVertical size={18} />}
            size="md"
            variant="ghost"
          />
          <MenuList>
            <MenuItem onClick={() => onEdit(plan)}>編集</MenuItem>
            <MenuItem
              color={isActive ? 'red.600' : undefined}
              onClick={() => onToggleActive(plan)}
            >
              {isActive ? '無効化する' : '再有効化する'}
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  );
}
