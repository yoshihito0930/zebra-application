import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  Select,
  Spinner,
  Text,
  VStack,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import AdminMobileFab from '../../layouts/AdminMobileFab';
import { useOptions, useUpdateOption } from '../../../hooks/usePlans';
import { getErrorMessage } from '../../../services/api';
import type { Option } from '../../../types';
import MobileOptionCard from './MobileOptionCard';
import OptionFormModal from './OptionFormModal';
import OptionsTable from './OptionsTable';
import ToggleActiveDialog from './ToggleActiveDialog';

interface OptionsTabProps {
  studioId: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function OptionsTab({ studioId }: OptionsTabProps) {
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const formModal = useDisclosure();
  const toggleDialog = useDisclosure();

  const updateMutation = useUpdateOption();

  const {
    data: options = [],
    isLoading,
    error,
  } = useOptions(studioId, { includeInactive: true });

  const filteredOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });
    if (statusFilter === 'active') return sorted.filter((o) => o.is_active);
    if (statusFilter === 'inactive') return sorted.filter((o) => !o.is_active);
    return sorted;
  }, [options, statusFilter]);

  const nextDisplayOrder = useMemo(() => {
    if (options.length === 0) return 1;
    return Math.max(...options.map((o) => o.display_order)) + 1;
  }, [options]);

  const openCreate = () => {
    setFormMode('create');
    setSelectedOption(null);
    formModal.onOpen();
  };

  const openEdit = (option: Option) => {
    setFormMode('edit');
    setSelectedOption(option);
    formModal.onOpen();
  };

  const openToggle = (option: Option) => {
    setSelectedOption(option);
    toggleDialog.onOpen();
  };

  const handleToggleConfirm = () => {
    if (!selectedOption) return;
    const nextActive = !selectedOption.is_active;
    updateMutation.mutate(
      {
        optionId: selectedOption.option_id,
        data: { is_active: nextActive },
      },
      {
        onSuccess: () => {
          toast({
            title: nextActive
              ? 'オプションを再有効化しました'
              : 'オプションを無効化しました',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          toggleDialog.onClose();
        },
        onError: (error) => {
          toast({
            title: '状態の変更に失敗しました',
            description: getErrorMessage(error),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  };

  return (
    <VStack spacing={4} align="stretch" pb={isMobile ? 24 : 0}>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        gap={3}
      >
        <HStack
          justify="space-between"
          align="center"
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          px={3}
          py={2}
          flex={1}
        >
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.600">
              ステータス:
            </Text>
            <Select
              size="sm"
              maxW="140px"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">全て</option>
              <option value="active">有効のみ</option>
              <option value="inactive">無効のみ</option>
            </Select>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {isLoading ? '...' : `${filteredOptions.length}件`}
          </Text>
        </HStack>
        {!isMobile && (
          <Button
            colorScheme="brand"
            leftIcon={<Plus size={16} />}
            onClick={openCreate}
          >
            新規オプション
          </Button>
        )}
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" color="brand.500" />
        </Flex>
      ) : error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          オプション一覧の取得に失敗しました
        </Alert>
      ) : filteredOptions.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          {statusFilter === 'all'
            ? 'オプションがまだ登録されていません'
            : '該当するオプションはありません'}
        </Alert>
      ) : isMobile ? (
        <VStack spacing={2} align="stretch">
          {filteredOptions.map((option) => (
            <MobileOptionCard
              key={option.option_id}
              option={option}
              onEdit={openEdit}
              onToggleActive={openToggle}
            />
          ))}
        </VStack>
      ) : (
        <Box
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          overflow="hidden"
        >
          <OptionsTable
            options={filteredOptions}
            onEdit={openEdit}
            onToggleActive={openToggle}
          />
        </Box>
      )}

      {isMobile && (
        <AdminMobileFab onClick={openCreate} label="オプションを追加" />
      )}

      <OptionFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.onClose}
        studioId={studioId}
        mode={formMode}
        option={formMode === 'edit' ? selectedOption ?? undefined : undefined}
        nextDisplayOrder={nextDisplayOrder}
      />
      <ToggleActiveDialog
        isOpen={toggleDialog.isOpen}
        onClose={toggleDialog.onClose}
        itemType="option"
        itemName={selectedOption?.option_name ?? ''}
        isActive={selectedOption?.is_active ?? true}
        onConfirm={handleToggleConfirm}
        isLoading={updateMutation.isPending}
      />
    </VStack>
  );
}
