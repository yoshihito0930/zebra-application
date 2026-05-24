import type { BlockedSlot, CreateBlockedSlotRequest } from '../types';
import { apiRequest } from './api';

export interface ListBlockedSlotsParams {
  studio_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

// backend は { blocked_slots: [...] } で wrap して返す
export const listBlockedSlots = async (
  params: ListBlockedSlotsParams
): Promise<BlockedSlot[]> => {
  const resp = await apiRequest<{ blocked_slots: BlockedSlot[] }>({
    method: 'GET',
    url: '/blocked-slots',
    params,
  });
  return resp.blocked_slots ?? [];
};

export const createBlockedSlot = async (
  data: CreateBlockedSlotRequest
): Promise<BlockedSlot> => {
  return apiRequest<BlockedSlot>({
    method: 'POST',
    url: '/blocked-slots',
    data,
  });
};

export const deleteBlockedSlot = async (id: string): Promise<void> => {
  await apiRequest<void>({
    method: 'DELETE',
    url: `/blocked-slots/${id}`,
  });
};
