import type { Studio } from '../types';
import { apiRequest } from './api';

// スタジオ情報取得（GET /studios/{id}、公開・認証不要）。
// backend (studio-get/main.go) は StudioResponse を平坦な JSON で返すため normalize 不要。
export const getStudio = async (studioId: string): Promise<Studio> =>
  apiRequest<Studio>({
    method: 'GET',
    url: `/studios/${studioId}`,
  });
