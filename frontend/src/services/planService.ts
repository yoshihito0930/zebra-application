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
// plans.json の内容と整合性を保つ
export const mockPlans: Plan[] = [
  {
    plan_id: 'plan_001',
    studio_id: 'studio_001',
    plan_name: '10人以下でのご利用',
    description: '¥5,000/1h（税込￥5,500/1h）',
    price: 5000,
    tax_rate: 0.1,
    display_order: 1,
    is_active: true,
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    plan_id: 'plan_002',
    studio_id: 'studio_001',
    plan_name: '11人以上でのご利用',
    description: ' ¥5,500/1h（税込￥6,050/1h）',
    price: 5500,
    tax_rate: 0.1,
    display_order: 2,
    is_active: true,
    created_at: '2026-05-01T00:00:00Z',
  },
];

// options.json の内容と整合性を保つ
export const mockOptions: Option[] = [
  {
    option_id: 'option_001',
    studio_id: 'studio_001',
    option_name: '6人以上のワークショップ',
    price: 2000,
    tax_rate: 0.1,
    display_order: 1,
    is_active: true,
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    option_id: 'option_002',
    studio_id: 'studio_001',
    option_name: 'ラメやグリッターを多用した衣装（小道具）のお持ち込み',
    price: 2000,
    tax_rate: 0.1,
    display_order: 2,
    is_active: true,
    created_at: '2026-05-01T00:00:00Z',
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
