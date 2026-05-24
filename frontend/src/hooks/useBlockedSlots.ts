import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBlockedSlot,
  deleteBlockedSlot,
  listBlockedSlots,
  type ListBlockedSlotsParams,
} from '../services/blockedSlotService';
import { calendarKeys } from './useCalendar';
import type { BlockedSlot, CreateBlockedSlotRequest } from '../types';

export const blockedSlotKeys = {
  all: ['blocked-slots'] as const,
  list: (params: ListBlockedSlotsParams) =>
    [...blockedSlotKeys.all, 'list', params] as const,
};

/**
 * ブロック枠一覧を取得するフック
 */
export const useBlockedSlots = (params: ListBlockedSlotsParams) => {
  return useQuery({
    queryKey: blockedSlotKeys.list(params),
    queryFn: (): Promise<BlockedSlot[]> => listBlockedSlots(params),
    enabled: !!params.studio_id && !!params.start_date && !!params.end_date,
    staleTime: 60 * 1000,
  });
};

/**
 * ブロック枠を作成するフック
 */
export const useCreateBlockedSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlockedSlotRequest) => createBlockedSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockedSlotKeys.all });
      // カレンダー画面（getCalendar）も blocked_slots を含むので無効化
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};

/**
 * ブロック枠を削除するフック
 */
export const useDeleteBlockedSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlockedSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockedSlotKeys.all });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};
