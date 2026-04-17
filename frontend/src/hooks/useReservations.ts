import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyReservations,
  getReservation,
  createReservation,
  cancelReservation,
  mockGetMyReservations,
  mockCreateReservation,
  mockCancelReservation,
  mockGetAllReservations,
  mockApproveReservation,
  mockRejectReservation,
  mockGetMonthlyStatsRange,
} from '../services/reservationService';
import type { Reservation, CreateReservationRequest, MonthlyStats } from '../types';

// 環境変数でモックモード切り替え（現在はモックモード固定）
const USE_MOCK = true;

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

/**
 * 自分の予約一覧を取得するフック
 */
export const useMyReservations = () => {
  return useQuery({
    queryKey: reservationKeys.myReservations(),
    queryFn: async () => {
      if (USE_MOCK) {
        return mockGetMyReservations();
      }
      return getMyReservations();
    },
  });
};

/**
 * 予約詳細を取得するフック
 */
export const useReservation = (id: string | undefined) => {
  return useQuery({
    queryKey: reservationKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('予約IDが指定されていません');
      if (USE_MOCK) {
        // モックデータから取得
        const reservations = await mockGetMyReservations();
        const reservation = reservations.find((r) => r.reservation_id === id);
        if (!reservation) throw new Error('予約が見つかりません');
        return reservation;
      }
      return getReservation(id);
    },
    enabled: !!id, // idが存在する場合のみクエリを実行
  });
};

/**
 * 予約作成のミューテーション
 */
export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReservationRequest) => {
      if (USE_MOCK) {
        return mockCreateReservation(data);
      }
      return createReservation(data);
    },
    onSuccess: (newReservation) => {
      // 予約一覧のキャッシュを無効化（再フェッチ）
      queryClient.invalidateQueries({ queryKey: reservationKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      // 新しい予約をキャッシュに追加（楽観的更新）
      queryClient.setQueryData(
        reservationKeys.detail(newReservation.reservation_id),
        newReservation
      );
    },
  });
};

/**
 * 予約キャンセルのミューテーション
 */
export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        return mockCancelReservation(id);
      }
      return cancelReservation(id);
    },
    onSuccess: (cancelledReservation) => {
      // 予約一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: reservationKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      // 詳細ページのキャッシュを更新
      queryClient.setQueryData(
        reservationKeys.detail(cancelledReservation.reservation_id),
        cancelledReservation
      );
    },
  });
};

/**
 * 全予約一覧を取得するフック（管理者用）
 */
export const useAllReservations = (studioId: string, status?: string, dateRange?: 'all' | 'future' | 'past') => {
  return useQuery({
    queryKey: reservationKeys.list({ studioId, status, dateRange }),
    queryFn: async () => {
      if (USE_MOCK) {
        return mockGetAllReservations(studioId, status, dateRange);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
  });
};

/**
 * 予約承認のミューテーション（管理者用）
 */
export const useApproveReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      approvedStatus,
    }: {
      id: string;
      approvedStatus: 'confirmed' | 'tentative' | 'scheduled';
    }) => {
      if (USE_MOCK) {
        return mockApproveReservation(id, approvedStatus);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
    onSuccess: (updatedReservation) => {
      // 予約一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      // 詳細ページのキャッシュを更新
      queryClient.setQueryData(
        reservationKeys.detail(updatedReservation.reservation_id),
        updatedReservation
      );
    },
  });
};

/**
 * 予約拒否のミューテーション（管理者用）
 */
export const useRejectReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      if (USE_MOCK) {
        return mockRejectReservation(id, note);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
    onSuccess: (updatedReservation) => {
      // 予約一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });

      // 詳細ページのキャッシュを更新
      queryClient.setQueryData(
        reservationKeys.detail(updatedReservation.reservation_id),
        updatedReservation
      );
    },
  });
};

/**
 * 今日の予約一覧を取得するフック（管理者・スタッフ用）
 */
export const useTodayReservations = (studioId: string) => {
  return useQuery({
    queryKey: reservationKeys.todayReservations(studioId),
    queryFn: async () => {
      if (USE_MOCK) {
        // 今日の日付を取得 (YYYY-MM-DD形式)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // 全予約を取得してフィルタリング
        const allReservations = await mockGetAllReservations(studioId);
        return allReservations.filter((r) => r.date === todayStr);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
  });
};

/**
 * 月別統計を取得するフック（管理者用）
 */
export const useMonthlyStatsRange = (
  studioId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
) => {
  return useQuery({
    queryKey: [...reservationKeys.all, 'monthly-stats', studioId, startYear, startMonth, endYear, endMonth],
    queryFn: async () => {
      if (USE_MOCK) {
        return mockGetMonthlyStatsRange(studioId, startYear, startMonth, endYear, endMonth);
      }
      // 実APIの場合の実装（未実装）
      throw new Error('実APIは未実装です');
    },
  });
};
