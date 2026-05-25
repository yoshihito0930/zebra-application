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
import { usePlans, useUpdatePlan } from '../../../hooks/usePlans';
import { getErrorMessage } from '../../../services/api';
import type { Plan } from '../../../types';
import MobilePlanCard from './MobilePlanCard';
import PlanFormModal from './PlanFormModal';
import PlansTable from './PlansTable';
import ToggleActiveDialog from './ToggleActiveDialog';

interface PlansTabProps {
  studioId: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function PlansTab({ studioId }: PlansTabProps) {
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const formModal = useDisclosure();
  const toggleDialog = useDisclosure();

  const updateMutation = useUpdatePlan();

  const {
    data: plans = [],
    isLoading,
    error,
  } = usePlans(studioId, { includeInactive: true });

  const filteredPlans = useMemo(() => {
    const sorted = [...plans].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });
    if (statusFilter === 'active') return sorted.filter((p) => p.is_active);
    if (statusFilter === 'inactive') return sorted.filter((p) => !p.is_active);
    return sorted;
  }, [plans, statusFilter]);

  const nextDisplayOrder = useMemo(() => {
    if (plans.length === 0) return 1;
    return Math.max(...plans.map((p) => p.display_order)) + 1;
  }, [plans]);

  const openCreate = () => {
    setFormMode('create');
    setSelectedPlan(null);
    formModal.onOpen();
  };

  const openEdit = (plan: Plan) => {
    setFormMode('edit');
    setSelectedPlan(plan);
    formModal.onOpen();
  };

  const openToggle = (plan: Plan) => {
    setSelectedPlan(plan);
    toggleDialog.onOpen();
  };

  const handleToggleConfirm = () => {
    if (!selectedPlan) return;
    const nextActive = !selectedPlan.is_active;
    updateMutation.mutate(
      { planId: selectedPlan.plan_id, data: { is_active: nextActive } },
      {
        onSuccess: () => {
          toast({
            title: nextActive
              ? 'プランを再有効化しました'
              : 'プランを無効化しました',
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
      {/* ツールバー */}
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
            {isLoading ? '...' : `${filteredPlans.length}件`}
          </Text>
        </HStack>
        {!isMobile && (
          <Button
            colorScheme="brand"
            leftIcon={<Plus size={16} />}
            onClick={openCreate}
          >
            新規プラン
          </Button>
        )}
      </Flex>

      {/* 本体 */}
      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" color="brand.500" />
        </Flex>
      ) : error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          プラン一覧の取得に失敗しました
        </Alert>
      ) : filteredPlans.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          {statusFilter === 'all'
            ? 'プランがまだ登録されていません'
            : '該当するプランはありません'}
        </Alert>
      ) : isMobile ? (
        <VStack spacing={2} align="stretch">
          {filteredPlans.map((plan) => (
            <MobilePlanCard
              key={plan.plan_id}
              plan={plan}
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
          <PlansTable
            plans={filteredPlans}
            onEdit={openEdit}
            onToggleActive={openToggle}
          />
        </Box>
      )}

      {/* モバイル FAB */}
      {isMobile && (
        <AdminMobileFab onClick={openCreate} label="プランを追加" />
      )}

      {/* モーダル */}
      <PlanFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.onClose}
        studioId={studioId}
        mode={formMode}
        plan={formMode === 'edit' ? selectedPlan ?? undefined : undefined}
        nextDisplayOrder={nextDisplayOrder}
      />
      <ToggleActiveDialog
        isOpen={toggleDialog.isOpen}
        onClose={toggleDialog.onClose}
        itemType="plan"
        itemName={selectedPlan?.plan_name ?? ''}
        isActive={selectedPlan?.is_active ?? true}
        onConfirm={handleToggleConfirm}
        isLoading={updateMutation.isPending}
      />
    </VStack>
  );
}
