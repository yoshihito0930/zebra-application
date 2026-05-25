import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlans,
  getOptions,
  createPlan,
  updatePlan,
  createOption,
  updateOption,
} from '../services/planService';
import type {
  Plan,
  Option,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateOptionRequest,
  UpdateOptionRequest,
} from '../types';

// クエリキー定義
export const planKeys = {
  all: ['plans'] as const,
  list: (studioId: string, includeInactive: boolean) =>
    [...planKeys.all, studioId, { includeInactive }] as const,
};

export const optionKeys = {
  all: ['options'] as const,
  list: (studioId: string, includeInactive: boolean) =>
    [...optionKeys.all, studioId, { includeInactive }] as const,
};

interface ListOpts {
  includeInactive?: boolean;
}

/**
 * プラン一覧を取得するフック
 */
export const usePlans = (studioId: string, opts?: ListOpts) => {
  const includeInactive = !!opts?.includeInactive;
  return useQuery({
    queryKey: planKeys.list(studioId, includeInactive),
    queryFn: (): Promise<Plan[]> => getPlans(studioId, includeInactive),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * オプション一覧を取得するフック
 */
export const useOptions = (studioId: string, opts?: ListOpts) => {
  const includeInactive = !!opts?.includeInactive;
  return useQuery({
    queryKey: optionKeys.list(studioId, includeInactive),
    queryFn: (): Promise<Option[]> => getOptions(studioId, includeInactive),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * プランを作成するフック
 */
export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanRequest) => createPlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all });
    },
  });
};

/**
 * プランを更新するフック
 */
export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      data,
    }: {
      planId: string;
      data: UpdatePlanRequest;
    }) => updatePlan(planId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all });
    },
  });
};

/**
 * オプションを作成するフック
 */
export const useCreateOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOptionRequest) => createOption(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optionKeys.all });
    },
  });
};

/**
 * オプションを更新するフック
 */
export const useUpdateOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      optionId,
      data,
    }: {
      optionId: string;
      data: UpdateOptionRequest;
    }) => updateOption(optionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: optionKeys.all });
    },
  });
};
