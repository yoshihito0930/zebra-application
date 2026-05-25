import type {
  Plan,
  Option,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateOptionRequest,
  UpdateOptionRequest,
} from '../types';
import { apiRequest } from './api';

// プラン一覧取得 (backend は { plans: [...] } で wrap)
// includeInactive=true の場合、無効プランも取得（管理画面用）
export const getPlans = async (
  studioId: string,
  includeInactive: boolean = false
): Promise<Plan[]> => {
  const resp = await apiRequest<{ plans: Plan[] }>({
    method: 'GET',
    url: `/studios/${studioId}/plans`,
    params: includeInactive ? { include_inactive: 'true' } : undefined,
  });
  return resp.plans ?? [];
};

export const createPlan = async (data: CreatePlanRequest): Promise<Plan> => {
  return apiRequest<Plan>({
    method: 'POST',
    url: '/plans',
    data,
  });
};

export const updatePlan = async (
  planId: string,
  data: UpdatePlanRequest
): Promise<Plan> => {
  return apiRequest<Plan>({
    method: 'PATCH',
    url: `/plans/${planId}`,
    data,
  });
};

// オプション一覧取得 (backend は { options: [...] } で wrap)
// includeInactive=true の場合、無効オプションも取得（管理画面用）
export const getOptions = async (
  studioId: string,
  includeInactive: boolean = false
): Promise<Option[]> => {
  const resp = await apiRequest<{ options: Option[] }>({
    method: 'GET',
    url: `/studios/${studioId}/options`,
    params: includeInactive ? { include_inactive: 'true' } : undefined,
  });
  return resp.options ?? [];
};

export const createOption = async (
  data: CreateOptionRequest
): Promise<Option> => {
  return apiRequest<Option>({
    method: 'POST',
    url: '/options',
    data,
  });
};

export const updateOption = async (
  optionId: string,
  data: UpdateOptionRequest
): Promise<Option> => {
  return apiRequest<Option>({
    method: 'PATCH',
    url: `/options/${optionId}`,
    data,
  });
};
