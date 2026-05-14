import type { Plan, Option } from '../types';
import { apiRequest } from './api';

// プラン一覧取得 (backend は { plans: [...] } で wrap)
export const getPlans = async (studioId: string): Promise<Plan[]> => {
  const resp = await apiRequest<{ plans: Plan[] }>({
    method: 'GET',
    url: `/studios/${studioId}/plans`,
  });
  return resp.plans ?? [];
};

// オプション一覧取得 (backend は { options: [...] } で wrap)
export const getOptions = async (studioId: string): Promise<Option[]> => {
  const resp = await apiRequest<{ options: Option[] }>({
    method: 'GET',
    url: `/studios/${studioId}/options`,
  });
  return resp.options ?? [];
};
