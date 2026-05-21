import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyReservations,
  getReservation,
  createReservation,
  createGuestReservation,
  cancelReservation,
  getAllReservations,
  approveReservation,
  rejectReservation,
  promoteReservation,
} from '../services/reservationService';
import type { CreateReservationRequest, Reservation, MonthlyStats } from '../types';

// クエリキー定義
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (filters?: { studioId?: string; status?: string; dateRange?: string }) =>
    [...reservationKeys.lists(), filters] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
  myReservations: () => [...reservationKeys.all, 'my'] as const,
  todayReservations: (studioId: string) => [...reservationKeys.all, 'today', studioId] as const,
};

// dateRange ('all'|'future'|'past') を backend が要求する start_date/end_date に変換する
const computeDateRange = (range: 'all' | 'future' | 'past' = 'all') => {
  const today = new Date().toISOString().slice(0, 10);
  switch (range) {
    case 'future':
      return { start_date: today, end_date: '2099-12-31' };
    case 'past':
      return { start_date: '2000-01-01', end_date: today };
    default:
      return { start_date: '2000-01-01', end_date: '2099-12-31' };
  }
};

/**
 * 自分の予約一覧を取得するフック
 */
export const useMyReservations = () => {
  return useQuery({
    queryKey: reservationKeys.myReservations(),
    queryFn: () => getMyReservations(),
  });
};

/**
 * 予約詳細を取得するフック
 */
export const useReservation = (id: string | undefined) => {
  return useQuery({
    queryKey: reservationKeys.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('予約IDが指定されていません');
      return getReservation(id);
    },
    enabled: !!id,
  });
};

/**
 * 予約作成のミューテーション
 */
export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReservationRequest) => createReservation(data),
    onSuccess: (newReservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      queryClient.setQueryData(
        reservationKeys.detail(newReservation.reservation_id),
        newReservation
      );
    },
  });
};

/**
 * ゲスト予約作成のミューテーション（認証不要）
 * カレンダー一覧はゲストでも閲覧するため lists のキャッシュは無効化する。
 * me クエリはゲストでは存在しないため触らない。
 */
export const useCreateGuestReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReservationRequest) => createGuestReservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
};

/**
 * 予約キャンセルのミューテーション
 */
export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: (cancelledReservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: reservationKeys.detail(cancelledReservation.reservation_id),
      });
    },
  });
};

/**
 * 全予約一覧を取得するフック（管理者・スタッフ用）
 */
export const useAllReservations = (
  studioId: string,
  status?: string,
  dateRange: 'all' | 'future' | 'past' = 'all'
) => {
  return useQuery({
    queryKey: reservationKeys.list({ studioId, status, dateRange }),
    queryFn: () =>
      getAllReservations({
        studio_id: studioId,
        ...computeDateRange(dateRange),
        ...(status && status !== 'all' ? { status } : {}),
      }),
  });
};

/**
 * 予約承認のミューテーション（管理者用） — backend は body を受け取らない
 */
export const useApproveReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => approveReservation(id),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      queryClient.setQueryData(
        reservationKeys.detail(updatedReservation.reservation_id),
        updatedReservation
      );
    },
  });
};

/**
 * 予約拒否のミューテーション（管理者用） — backend は body を受け取らない (Bug 11 で reason は無視される)
 */
export const useRejectReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => rejectReservation(id),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      queryClient.setQueryData(
        reservationKeys.detail(updatedReservation.reservation_id),
        updatedReservation
      );
    },
  });
};

/**
 * 仮予約昇格のミューテーション
 */
export const usePromoteReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => promoteReservation(id),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      queryClient.setQueryData(
        reservationKeys.detail(updatedReservation.reservation_id),
        updatedReservation
      );
    },
  });
};

/**
 * 今日の予約一覧を取得するフック（管理者・スタッフ用）
 * NOTE: backend に専用エンドポイントが存在しないため、当日の予約は別途実装するか
 *       useAllReservations 経由でフィルタする運用に変更する。現状は空配列を返す。
 */
export const useTodayReservations = (studioId: string) => {
  return useQuery({
    queryKey: reservationKeys.todayReservations(studioId),
    queryFn: async (): Promise<Reservation[]> => [],
  });
};

/**
 * 月別統計を取得するフック（管理者用）
 * NOTE: backend に専用エンドポイントが存在しないため、現状は空配列を返す。
 *       将来的にダッシュボード用集計 API を追加した際にここを差し替える。
 */
export const useMonthlyStatsRange = (
  studioId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
) => {
  return useQuery({
    queryKey: [
      ...reservationKeys.all,
      'monthly-stats',
      studioId,
      startYear,
      startMonth,
      endYear,
      endMonth,
    ],
    queryFn: async (): Promise<MonthlyStats[]> => [],
  });
};
