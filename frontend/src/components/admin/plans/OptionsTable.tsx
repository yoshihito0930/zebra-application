import {
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
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
import type { Option } from '../../../types';

interface OptionsTableProps {
  options: Option[];
  onEdit: (option: Option) => void;
  onToggleActive: (option: Option) => void;
}

export default function OptionsTable({
  options,
  onEdit,
  onToggleActive,
}: OptionsTableProps) {
  return (
    <Table size="md" variant="simple" bg="white">
      <Thead bg="gray.50">
        <Tr>
          <Th w="80px">表示順</Th>
          <Th>オプション名</Th>
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
        {options.map((option) => {
          const inactiveColor = option.is_active ? undefined : 'gray.400';
          return (
            <Tr key={option.option_id}>
              <Td color={inactiveColor}>{option.display_order}</Td>
              <Td color={inactiveColor}>
                <Text fontWeight="medium">{option.option_name}</Text>
              </Td>
              <Td isNumeric color={inactiveColor}>
                ¥{option.price.toLocaleString()}
              </Td>
              <Td color={inactiveColor}>{Math.round(option.tax_rate * 100)}%</Td>
              <Td>
                <Badge colorScheme={option.is_active ? 'green' : 'gray'}>
                  {option.is_active ? '有効' : '無効'}
                </Badge>
              </Td>
              <Td textAlign="center">
                <Tooltip label="編集" hasArrow>
                  <IconButton
                    aria-label="編集"
                    icon={<Pencil size={16} />}
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(option)}
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
                  <Portal>
                    <MenuList>
                      <MenuItem onClick={() => onEdit(option)}>編集</MenuItem>
                      <MenuItem
                        color={option.is_active ? 'red.600' : undefined}
                        onClick={() => onToggleActive(option)}
                      >
                        {option.is_active ? '無効化する' : '再有効化する'}
                      </MenuItem>
                    </MenuList>
                  </Portal>
                </Menu>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
