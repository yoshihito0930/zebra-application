import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Reservation } from '../types';

export type TabKey = 'all' | 'pending' | 'confirmed' | 'tentative' | 'other';

export const TAB_KEYS: TabKey[] = ['all', 'pending', 'confirmed', 'tentative', 'other'];

export const TAB_LABELS: Record<TabKey, string> = {
  all: '全て',
  pending: '承認待ち',
  confirmed: '確定',
  tentative: '仮予約',
  other: 'その他',
};

const OTHER_STATUSES = new Set(['waitlisted', 'scheduled', 'cancelled', 'expired', 'completed']);

export function filterByTab(reservations: Reservation[], tab: TabKey): Reservation[] {
  if (tab === 'all') return reservations;
  if (tab === 'other') return reservations.filter((r) => OTHER_STATUSES.has(r.status));
  return reservations.filter((r) => r.status === tab);
}

export function countByTab(reservations: Reservation[]): Record<TabKey, number> {
  const counts: Record<TabKey, number> = { all: 0, pending: 0, confirmed: 0, tentative: 0, other: 0 };
  for (const r of reservations) {
    counts.all += 1;
    if (r.status === 'pending') counts.pending += 1;
    else if (r.status === 'confirmed') counts.confirmed += 1;
    else if (r.status === 'tentative') counts.tentative += 1;
    else if (OTHER_STATUSES.has(r.status)) counts.other += 1;
  }
  return counts;
}

export interface ReservationGroup {
  date: string;
  label: string;
  reservations: Reservation[];
}

export function groupReservationsByDate(
  reservations: Reservation[],
  order: 'asc' | 'desc' = 'asc'
): ReservationGroup[] {
  const map = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const list = map.get(r.date);
    if (list) list.push(r);
    else map.set(r.date, [r]);
  }

  const dates = Array.from(map.keys()).sort((a, b) => (order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));

  return dates.map((date) => {
    const items = (map.get(date) ?? []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      date,
      label: getDateHeaderLabel(date, items.length),
      reservations: items,
    };
  });
}

export function getDateHeaderLabel(date: string, count: number): string {
  const d = parseISO(date);
  const base = format(d, 'M月d日（E）', { locale: ja });
  const suffix = `${count}件`;
  if (isToday(d)) return `${base} 今日 ${suffix}`;
  if (isTomorrow(d)) return `${base} 明日 ${suffix}`;
  return `${base} ${suffix}`;
}

export function isNewReservation(target: Reservation, all: Reservation[]): boolean {
  const key = target.is_guest ? target.guest_email : target.user_id;
  if (!key) return false;
  let count = 0;
  for (const r of all) {
    const otherKey = r.is_guest ? r.guest_email : r.user_id;
    if (otherKey === key) {
      count += 1;
      if (count > 1) return false;
    }
  }
  return count === 1;
}

export function formatRevenueShort(value: number): string {
  if (value >= 1_000_000) {
    return `¥${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `¥${Math.round(value / 1_000)}K`;
  }
  return `¥${value.toLocaleString()}`;
}
