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
// 旧バージョンの backend は is_active を返さない場合があるため、
// 未定義のときは true として扱う（旧仕様では有効プランしか返ってこなかったため）
export const getPlans = async (
  studioId: string,
  includeInactive: boolean = false
): Promise<Plan[]> => {
  const resp = await apiRequest<{ plans: Plan[] }>({
    method: 'GET',
    url: `/studios/${studioId}/plans`,
    params: includeInactive ? { include_inactive: 'true' } : undefined,
  });
  return (resp.plans ?? []).map((p) => ({
    ...p,
    is_active: p.is_active ?? true,
  }));
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
// 旧バージョンの backend は is_active を返さない場合があるため、
// 未定義のときは true として扱う（旧仕様では有効オプションしか返ってこなかったため）
export const getOptions = async (
  studioId: string,
  includeInactive: boolean = false
): Promise<Option[]> => {
  const resp = await apiRequest<{ options: Option[] }>({
    method: 'GET',
    url: `/studios/${studioId}/options`,
    params: includeInactive ? { include_inactive: 'true' } : undefined,
  });
  return (resp.options ?? []).map((o) => ({
    ...o,
    is_active: o.is_active ?? true,
  }));
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
