import { Badge } from '@chakra-ui/react';
import type { ReservationStatus } from '../../types';

interface StatusBadgeProps {
  status: ReservationStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean; // 将来的にアイコン表示に対応するためのプロパティ
}

const statusConfig: Record<ReservationStatus, { label: string; variant: string }> = {
  confirmed: { label: '確定', variant: 'confirmed' },
  tentative: { label: '仮予約', variant: 'tentative' },
  pending: { label: '承認待ち', variant: 'pending' },
  waitlisted: { label: '第2キープ', variant: 'waitlisted' },
  scheduled: { label: 'ロケハン', variant: 'scheduled' },
  cancelled: { label: 'キャンセル', variant: 'cancelled' },
  expired: { label: '期限切れ', variant: 'expired' },
  completed: { label: '完了', variant: 'completed' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  const getFontSize = () => {
    switch (size) {
      case 'xs':
        return '9px';
      case 'sm':
        return '10px';
      case 'lg':
        return '14px';
      default:
        return '12px';
    }
  };

  return (
    <Badge variant={config.variant} fontSize={getFontSize()}>
      {config.label}
    </Badge>
  );
}
