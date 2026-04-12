package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// CalendarUsecase はカレンダー関連のユースケースを実装
type CalendarUsecase struct {
	reservationRepo repository.ReservationRepository
	blockedSlotRepo repository.BlockedSlotRepository
	studioRepo      repository.StudioRepository
}

// NewCalendarUsecase は CalendarUsecase のコンストラクタ
func NewCalendarUsecase(
	reservationRepo repository.ReservationRepository,
	blockedSlotRepo repository.BlockedSlotRepository,
	studioRepo repository.StudioRepository,
) *CalendarUsecase {
	return &CalendarUsecase{
		reservationRepo: reservationRepo,
		blockedSlotRepo: blockedSlotRepo,
		studioRepo:      studioRepo,
	}
}

// CalendarData はカレンダー表示用のデータ
type CalendarData struct {
	Reservations []*entity.Reservation
	BlockedSlots []*entity.BlockedSlot
}

// GetCalendar は予約状況を取得する（カレンダー表示用）
// アクセスパターン: AP-03（指定月の予約一覧）, AP-04（指定月のブロック枠一覧）
//
// 引数:
//   studioID: スタジオID
//   month: 対象月（YYYY-MM形式）
//
// 戻り値:
//   カレンダーデータ（予約一覧とブロック枠一覧）
func (u *CalendarUsecase) GetCalendar(ctx context.Context, studioID string, month time.Time) (*CalendarData, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, studioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. 対象月の開始日と終了日を計算
	startDate := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second) // 翌月の0時0分0秒 - 1秒 = 月末の23:59:59

	// 3. 予約一覧を取得（confirmed, tentative, scheduled のみ）
	allReservations, err := u.reservationRepo.FindByStudioAndDateRange(ctx, studioID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to find reservations: %w", err)
	}

	// カレンダー表示用にフィルタ（confirmed/tentative/scheduled のみ）
	var reservations []*entity.Reservation
	for _, r := range allReservations {
		if r.Status == entity.ReservationStatusConfirmed ||
			r.Status == entity.ReservationStatusTentative ||
			r.Status == entity.ReservationStatusScheduled {
			reservations = append(reservations, r)
		}
	}

	// 4. ブロック枠一覧を取得
	blockedSlots, err := u.blockedSlotRepo.FindByStudioAndDateRange(ctx, studioID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to find blocked slots: %w", err)
	}

	return &CalendarData{
		Reservations: reservations,
		BlockedSlots: blockedSlots,
	}, nil
}
