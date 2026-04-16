import { useQuery } from '@tanstack/react-query';
import { getCalendar, mockGetCalendar } from '../services/reservationService';
import type { CalendarResponse } from '../types';

// 環境変数でモックモード切り替え（現在はモックモード固定）
const USE_MOCK = true;

// クエリキー定義
export const calendarKeys = {
  all: ['calendar'] as const,
  detail: (studioId: string, year: number, month: number) =>
    [...calendarKeys.all, studioId, year, month] as const,
};

/**
 * カレンダー情報を取得するフック
 */
export const useCalendar = (studioId: string, year: number, month: number) => {
  return useQuery({
    queryKey: calendarKeys.detail(studioId, year, month),
    queryFn: async (): Promise<CalendarResponse> => {
      if (USE_MOCK) {
        return mockGetCalendar(studioId, year, month);
      }
      return getCalendar(studioId, year, month);
    },
    staleTime: 3 * 60 * 1000, // 3分間はキャッシュを新鮮と見なす
  });
};
