package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// BlockedSlotUsecase はブロック枠関連のユースケースを実装
type BlockedSlotUsecase struct {
	blockedSlotRepo repository.BlockedSlotRepository
	reservationRepo repository.ReservationRepository
	studioRepo      repository.StudioRepository
}

// NewBlockedSlotUsecase は BlockedSlotUsecase のコンストラクタ
func NewBlockedSlotUsecase(
	blockedSlotRepo repository.BlockedSlotRepository,
	reservationRepo repository.ReservationRepository,
	studioRepo repository.StudioRepository,
) *BlockedSlotUsecase {
	return &BlockedSlotUsecase{
		blockedSlotRepo: blockedSlotRepo,
		reservationRepo: reservationRepo,
		studioRepo:      studioRepo,
	}
}

// CreateBlockedSlotInput はブロック枠作成のリクエスト
type CreateBlockedSlotInput struct {
	StudioID  string
	Date      time.Time
	IsAllDay  bool
	StartTime *string
	EndTime   *string
	Reason    string
}

// CreateBlockedSlot はブロック枠を作成する
// アクセスパターン: AP-29（ブロック枠作成）
//
// ビジネスルール:
// 1. 指定日時に既存の予約（confirmed/tentative/scheduled）がないことを確認
func (u *BlockedSlotUsecase) CreateBlockedSlot(ctx context.Context, input CreateBlockedSlotInput) (*entity.BlockedSlot, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. 既存の予約との競合チェック（全日でない場合）
	if !input.IsAllDay && input.StartTime != nil && input.EndTime != nil {
		conflictingReservations, err := u.reservationRepo.FindConflicting(ctx, input.StudioID, input.Date, *input.StartTime, *input.EndTime)
		if err != nil {
			return nil, fmt.Errorf("failed to find conflicting reservations: %w", err)
		}
		if len(conflictingReservations) > 0 {
			return nil, apierror.ErrReservationConflict
		}
	}

	// 3. ブロック枠エンティティを作成
	now := time.Now()
	blockedSlot := &entity.BlockedSlot{
		BlockedSlotID: uuid.New().String(),
		StudioID:      input.StudioID,
		Date:          input.Date,
		IsAllDay:      input.IsAllDay,
		StartTime:     input.StartTime,
		EndTime:       input.EndTime,
		Reason:        input.Reason,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// 4. リポジトリに保存
	if err := u.blockedSlotRepo.Create(ctx, blockedSlot); err != nil {
		return nil, fmt.Errorf("failed to create blocked slot: %w", err)
	}

	return blockedSlot, nil
}

// ListBlockedSlotsInput はブロック枠一覧取得のリクエスト
type ListBlockedSlotsInput struct {
	StudioID  string
	StartDate time.Time
	EndDate   time.Time
}

// ListBlockedSlots はブロック枠一覧を取得する
// アクセスパターン: AP-30（ブロック枠一覧取得）
func (u *BlockedSlotUsecase) ListBlockedSlots(ctx context.Context, input ListBlockedSlotsInput) ([]*entity.BlockedSlot, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. ブロック枠一覧を取得
	blockedSlots, err := u.blockedSlotRepo.FindByStudioAndDateRange(ctx, input.StudioID, input.StartDate, input.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to list blocked slots: %w", err)
	}

	return blockedSlots, nil
}

// DeleteBlockedSlot はブロック枠を削除する
// アクセスパターン: AP-31（ブロック枠削除）
func (u *BlockedSlotUsecase) DeleteBlockedSlot(ctx context.Context, studioID, blockedSlotID string) error {
	// 1. ブロック枠の存在確認
	_, err := u.blockedSlotRepo.FindByID(ctx, studioID, blockedSlotID)
	if err != nil {
		return apierror.ErrBlockedSlotNotFound
	}

	// 2. リポジトリから削除
	if err := u.blockedSlotRepo.Delete(ctx, studioID, blockedSlotID); err != nil {
		return fmt.Errorf("failed to delete blocked slot: %w", err)
	}

	return nil
}
