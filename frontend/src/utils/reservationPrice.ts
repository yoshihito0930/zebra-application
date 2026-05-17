import type { Reservation } from '../types';

// HH:MM 形式の文字列から、利用時間（時間単位、小数あり）を計算
// 日跨ぎ（end <= start）の場合は +24h する
export const calculateUsageHours = (startTime: string, endTime: string): number => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (
    Number.isNaN(startH) ||
    Number.isNaN(startM) ||
    Number.isNaN(endH) ||
    Number.isNaN(endM)
  ) {
    return 0;
  }

  const startTotalMin = startH * 60 + startM;
  let endTotalMin = endH * 60 + endM;

  if (endTotalMin <= startTotalMin) {
    endTotalMin += 24 * 60;
  }

  return (endTotalMin - startTotalMin) / 60;
};

export interface ReservationPriceBreakdown {
  hours: number;
  planTotal: number;
  optionsTotal: number;
  subtotal: number;
  tax: number;
  total: number;
}

// 予約の料金内訳を計算
// プラン料金 = plan_price × 利用時間（時間単位）
// オプション料金 = Σ option.price（時間に依存しない固定料金）
// 消費税は税抜額にそれぞれの税率を掛けて Math.floor で個別に丸める
export const calculateReservationTotal = (
  reservation: Reservation
): ReservationPriceBreakdown => {
  const hours = calculateUsageHours(reservation.start_time, reservation.end_time);

  const planTotal = reservation.plan_price * hours;
  const planTax = Math.floor(planTotal * reservation.plan_tax_rate);

  const optionsTotal = reservation.options.reduce((sum, opt) => sum + opt.price, 0);
  const optionsTax = reservation.options.reduce(
    (sum, opt) => sum + Math.floor(opt.price * opt.tax_rate),
    0
  );

  const subtotal = planTotal + optionsTotal;
  const tax = planTax + optionsTax;
  const total = subtotal + tax;

  return { hours, planTotal, optionsTotal, subtotal, tax, total };
};
