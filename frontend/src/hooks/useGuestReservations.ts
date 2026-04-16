import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  mockGetGuestReservation,
  mockCancelGuestReservation,
} from '../services/reservationService';
import type { Reservation } from '../types';

// 環境変数でモックモード切り替え（現在はモックモード固定）
const USE_MOCK = true;

// クエリキー定義
export const guestReservationKeys = {
  all: ['guest-reservations'] as const,
  detail: (token: string) => [...guestReservationKeys.all, token] as const,
};

/**
 * ゲスト予約詳細を取得するフック
 */
export const useGuestReservation = (token: string | undefined) => {
  return useQuery({
    queryKey: guestReservationKeys.detail(token || ''),
    queryFn: async (): Promise<Reservation> => {
      if (!token) throw new Error('トークンが指定されていません');
      if (USE_MOCK) {
        return mockGetGuestReservation(token);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
    enabled: !!token, // tokenが存在する場合のみクエリを実行
    retry: false, // トークンエラーの場合はリトライしない
  });
};

/**
 * ゲスト予約キャンセルのミューテーション
 */
export const useCancelGuestReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (USE_MOCK) {
        return mockCancelGuestReservation(token);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
    onSuccess: (cancelledReservation, token) => {
      // ゲスト予約詳細のキャッシュを更新
      queryClient.setQueryData(guestReservationKeys.detail(token), cancelledReservation);
    },
  });
};
