import { useQuery } from '@tanstack/react-query';
import { getCalendar } from '../services/reservationService';
import type { CalendarResponse } from '../types';

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
    queryFn: (): Promise<CalendarResponse> => getCalendar(studioId, year, month),
    staleTime: 3 * 60 * 1000, // 3分間はキャッシュを新鮮と見なす
  });
};
