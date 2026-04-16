import { useQuery } from '@tanstack/react-query';
import { getPlans, getOptions, mockGetPlans, mockGetOptions } from '../services/planService';
import type { Plan, Option } from '../types';

// 環境変数でモックモード切り替え（現在はモックモード固定）
const USE_MOCK = true;

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
    queryFn: async (): Promise<Plan[]> => {
      if (USE_MOCK) {
        return mockGetPlans(studioId);
      }
      return getPlans(studioId);
    },
    staleTime: 10 * 60 * 1000, // 10分間はキャッシュを新鮮と見なす（プランは頻繁に変更されない）
  });
};

/**
 * オプション一覧を取得するフック
 */
export const useOptions = (studioId: string) => {
  return useQuery({
    queryKey: optionKeys.list(studioId),
    queryFn: async (): Promise<Option[]> => {
      if (USE_MOCK) {
        return mockGetOptions(studioId);
      }
      return getOptions(studioId);
    },
    staleTime: 10 * 60 * 1000, // 10分間はキャッシュを新鮮と見なす（オプションは頻繁に変更されない）
  });
};
