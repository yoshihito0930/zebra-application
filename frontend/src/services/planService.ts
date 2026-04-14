import apiClient, { apiRequest } from './api';
import type { Plan, Option } from '../types';

// プラン一覧取得
export const getPlans = async (studioId: string): Promise<Plan[]> => {
  return apiRequest<Plan[]>({
    method: 'GET',
    url: `/studios/${studioId}/plans`,
  });
};

// オプション一覧取得
export const getOptions = async (studioId: string): Promise<Option[]> => {
  return apiRequest<Option[]>({
    method: 'GET',
    url: `/studios/${studioId}/options`,
  });
};

// モックデータ（開発用）
export const mockPlans: Plan[] = [
  {
    plan_id: 'plan_001',
    studio_id: 'studio_001',
    plan_name: 'スチール撮影プラン',
    description: '写真撮影に最適なプラン。基本的な照明機材を含みます。',
    price: 15000,
    tax_rate: 0.1,
    display_order: 1,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    plan_id: 'plan_002',
    studio_id: 'studio_001',
    plan_name: '動画撮影プラン',
    description: '動画撮影向けプラン。音響設備も利用可能です。',
    price: 20000,
    tax_rate: 0.1,
    display_order: 2,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    plan_id: 'plan_003',
    studio_id: 'studio_001',
    plan_name: 'ロケハンプラン',
    description: 'スタジオ下見用のプラン。1時間無料です。',
    price: 0,
    tax_rate: 0.1,
    display_order: 3,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    plan_id: 'plan_004',
    studio_id: 'studio_001',
    plan_name: 'ワークショッププラン',
    description: '大人数でのワークショップ向けプラン。',
    price: 25000,
    tax_rate: 0.1,
    display_order: 4,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockOptions: Option[] = [
  {
    option_id: 'opt_001',
    studio_id: 'studio_001',
    option_name: '6人以上のワークショップでご利用',
    price: 2000,
    tax_rate: 0.1,
    display_order: 1,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    option_id: 'opt_002',
    studio_id: 'studio_001',
    option_name: '機材レンタル',
    price: 5000,
    tax_rate: 0.1,
    display_order: 2,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    option_id: 'opt_003',
    studio_id: 'studio_001',
    option_name: '延長料金（1時間）',
    price: 3000,
    tax_rate: 0.1,
    display_order: 3,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// モック取得関数
export const mockGetPlans = async (studioId: string): Promise<Plan[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms遅延
  return mockPlans.filter((p) => p.studio_id === studioId && p.is_active);
};

export const mockGetOptions = async (studioId: string): Promise<Option[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms遅延
  return mockOptions.filter((o) => o.studio_id === studioId && o.is_active);
};
