import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGuestReservation,
  cancelGuestReservation,
} from '../services/reservationService';
import type { Reservation } from '../types';

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
    queryFn: (): Promise<Reservation> => {
      if (!token) throw new Error('トークンが指定されていません');
      return getGuestReservation(token);
    },
    enabled: !!token,
    retry: false,
  });
};

/**
 * ゲスト予約キャンセルのミューテーション
 */
export const useCancelGuestReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => cancelGuestReservation(token),
    onSuccess: (cancelledReservation, token) => {
      queryClient.setQueryData(guestReservationKeys.detail(token), cancelledReservation);
    },
  });
};
