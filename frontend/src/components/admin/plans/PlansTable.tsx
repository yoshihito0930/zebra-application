import {
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { MoreVertical, Pencil } from 'lucide-react';
import type { Plan } from '../../../types';

interface PlansTableProps {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
}

export default function PlansTable({
  plans,
  onEdit,
  onToggleActive,
}: PlansTableProps) {
  return (
    <Table size="md" variant="simple" bg="white">
      <Thead bg="gray.50">
        <Tr>
          <Th w="80px">表示順</Th>
          <Th>プラン名</Th>
          <Th isNumeric w="140px">
            料金（税抜）
          </Th>
          <Th w="80px">税率</Th>
          <Th w="100px">ステータス</Th>
          <Th w="100px" textAlign="center">
            操作
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {plans.map((plan) => (
          <Tr key={plan.plan_id} opacity={plan.is_active ? 1 : 0.6}>
            <Td>{plan.display_order}</Td>
            <Td>
              <Text fontWeight="medium">{plan.plan_name}</Text>
              {plan.description && (
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {plan.description}
                </Text>
              )}
            </Td>
            <Td isNumeric>¥{plan.price.toLocaleString()}</Td>
            <Td>{Math.round(plan.tax_rate * 100)}%</Td>
            <Td>
              <Badge colorScheme={plan.is_active ? 'green' : 'gray'}>
                {plan.is_active ? '有効' : '無効'}
              </Badge>
            </Td>
            <Td textAlign="center">
              <Tooltip label="編集" hasArrow>
                <IconButton
                  aria-label="編集"
                  icon={<Pencil size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(plan)}
                />
              </Tooltip>
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="その他のアクション"
                  icon={<MoreVertical size={16} />}
                  size="sm"
                  variant="ghost"
                />
                <MenuList>
                  <MenuItem onClick={() => onEdit(plan)}>編集</MenuItem>
                  <MenuItem
                    color={plan.is_active ? 'red.600' : undefined}
                    onClick={() => onToggleActive(plan)}
                  >
                    {plan.is_active ? '無効化する' : '再有効化する'}
                  </MenuItem>
                </MenuList>
              </Menu>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
