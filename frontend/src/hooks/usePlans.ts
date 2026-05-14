import { useQuery } from '@tanstack/react-query';
import { getPlans, getOptions } from '../services/planService';
import type { Plan, Option } from '../types';

// クエリキー定義
export const planKeys = {
  all: ['plans'] as const,
  list: (studioId: string) => [...planKeys.all, studioId] as const,
};

export const optionKeys = {
  all: ['options'] as const,
  list: (studioId: string) => [...optionKeys.all, studioId] as const,
};

/**
 * プラン一覧を取得するフック
 */
export const usePlans = (studioId: string) => {
  return useQuery({
    queryKey: planKeys.list(studioId),
    queryFn: (): Promise<Plan[]> => getPlans(studioId),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * オプション一覧を取得するフック
 */
export const useOptions = (studioId: string) => {
  return useQuery({
    queryKey: optionKeys.list(studioId),
    queryFn: (): Promise<Option[]> => getOptions(studioId),
    staleTime: 10 * 60 * 1000,
  });
};
