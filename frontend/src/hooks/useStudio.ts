import { useQuery } from '@tanstack/react-query';
import { getStudio } from '../services/studioService';
import type { Studio } from '../types';

// クエリキー定義
export const studioKeys = {
  all: ['studio'] as const,
  detail: (studioId: string) => [...studioKeys.all, studioId] as const,
};

/**
 * スタジオ情報を取得するフック（公開・認証不要）
 */
export const useStudio = (studioId: string | undefined) => {
  return useQuery({
    queryKey: studioKeys.detail(studioId || ''),
    queryFn: (): Promise<Studio> => {
      if (!studioId) throw new Error('スタジオIDが指定されていません');
      return getStudio(studioId);
    },
    enabled: !!studioId,
    retry: false,
  });
};
