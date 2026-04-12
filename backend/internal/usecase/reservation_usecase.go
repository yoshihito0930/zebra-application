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

// ReservationUsecase は予約関連のユースケースを実装
type ReservationUsecase struct {
	reservationRepo  repository.ReservationRepository
	userRepo         repository.UserRepository
	planRepo         repository.PlanRepository
	blockedSlotRepo  repository.BlockedSlotRepository
	studioRepo       repository.StudioRepository
	tentativeExpiryDays int // 仮予約の有効期限（利用日の何日前か）
}

// NewReservationUsecase は ReservationUsecase のコンストラクタ
func NewReservationUsecase(
	reservationRepo repository.ReservationRepository,
	userRepo repository.UserRepository,
	planRepo repository.PlanRepository,
	blockedSlotRepo repository.BlockedSlotRepository,
	studioRepo repository.StudioRepository,
) *ReservationUsecase {
	return &ReservationUsecase{
		reservationRepo:     reservationRepo,
		userRepo:            userRepo,
		planRepo:            planRepo,
		blockedSlotRepo:     blockedSlotRepo,
		studioRepo:          studioRepo,
		tentativeExpiryDays: 7, // デフォルト7日前
	}
}

// CreateReservationInput は予約作成のリクエスト
type CreateReservationInput struct {
	StudioID           string
	UserID             string
	ReservationType    entity.ReservationType
	PlanID             string
	Date               time.Time
	StartTime          string
	EndTime            string
	Options            []string
	ShootingType       []string
	ShootingDetails    string
	PhotographerName   string
	NumberOfPeople     int
	NeedsProtection    bool
	EquipmentInsurance bool
	Note               *string
}

// CreateReservation は予約を作成する
// アクセスパターン: AP-07（予約作成）, AP-17（管理者側予約作成）
//
// ビジネスルール:
// 1. プランの存在確認と有効性チェック
// 2. 予約重複チェック（同一時間帯にconfirmed/tentative/scheduledの予約が存在しないこと）
// 3. ブロック枠チェック（指定日時にブロック枠が存在しないこと）
// 4. 第2キープの前提チェック（reservation_type=second_keepの場合、同一時間帯にconfirmed/tentativeの予約が存在すること）
// 5. 定休日チェック（指定日がスタジオの定休日でないこと）
func (u *ReservationUsecase) CreateReservation(ctx context.Context, input CreateReservationInput) (*entity.Reservation, error) {
	// 1. プランの存在確認と有効性チェック
	plan, err := u.planRepo.FindByID(ctx, input.StudioID, input.PlanID)
	if err != nil {
		return nil, apierror.ErrPlanNotFound
	}
	if !plan.IsActive {
		return nil, apierror.ErrPlanInactive
	}

	// 2. スタジオの存在確認（定休日チェック用）
	studio, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 3. 定休日チェック
	if studio.IsRegularHoliday(input.Date) {
		return nil, apierror.ErrRegularHoliday
	}

	// 4. ブロック枠チェック
	blockedSlots, err := u.blockedSlotRepo.FindByStudioAndDate(ctx, input.StudioID, input.Date)
	if err != nil {
		return nil, fmt.Errorf("failed to find blocked slots: %w", err)
	}
	for _, slot := range blockedSlots {
		if slot.IsConflicting(input.StartTime, input.EndTime) {
			return nil, apierror.ErrBlockedSlotConflict
		}
	}

	// 5. 予約重複チェック（第2キープ以外）
	conflictingReservations, err := u.reservationRepo.FindConflicting(ctx, input.StudioID, input.Date, input.StartTime, input.EndTime)
	if err != nil {
		return nil, fmt.Errorf("failed to find conflicting reservations: %w", err)
	}

	if input.ReservationType == entity.ReservationTypeSecondKeep {
		// 第2キープの場合: 同一時間帯にconfirmed/tentativeの予約が存在することを確認
		if len(conflictingReservations) == 0 {
			return nil, apierror.ErrSecondKeepNoPrimary
		}
		// 第1候補の予約IDを取得（複数ある場合は最初のものを選択）
		linkedReservationID := conflictingReservations[0].ReservationID
		input.Note = &linkedReservationID // LinkedReservationIDとして保存
	} else {
		// 通常の予約の場合: 重複があればエラー
		if len(conflictingReservations) > 0 {
			return nil, apierror.ErrReservationConflict
		}
	}

	// 6. 予約エンティティを作成
	now := time.Now()
	reservation := &entity.Reservation{
		ReservationID:      uuid.New().String(),
		StudioID:           input.StudioID,
		UserID:             input.UserID,
		ReservationType:    input.ReservationType,
		Status:             entity.ReservationStatusPending, // 初期状態は承認待ち
		PlanID:             input.PlanID,
		Date:               input.Date,
		StartTime:          input.StartTime,
		EndTime:            input.EndTime,
		Note:               input.Note,
		NeedsProtection:    input.NeedsProtection,
		NumberOfPeople:     input.NumberOfPeople,
		EquipmentInsurance: input.EquipmentInsurance,
		Options:            input.Options,
		ShootingType:       input.ShootingType,
		ShootingDetails:    input.ShootingDetails,
		PhotographerName:   input.PhotographerName,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	// 第2キープの場合は LinkedReservationID を設定
	if input.ReservationType == entity.ReservationTypeSecondKeep && len(conflictingReservations) > 0 {
		linkedID := conflictingReservations[0].ReservationID
		reservation.LinkedReservationID = &linkedID
	}

	// 7. リポジトリに保存
	if err := u.reservationRepo.Create(ctx, reservation); err != nil {
		return nil, fmt.Errorf("failed to create reservation: %w", err)
	}

	return reservation, nil
}

// GetReservation は予約詳細を取得する
// アクセスパターン: AP-10（予約詳細取得）
func (u *ReservationUsecase) GetReservation(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	reservation, err := u.reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		return nil, apierror.ErrReservationNotFound
	}
	return reservation, nil
}

// ListUserReservations は自分の予約一覧を取得する
// アクセスパターン: AP-09（自分の予約一覧取得）
func (u *ReservationUsecase) ListUserReservations(ctx context.Context, userID string) ([]*entity.Reservation, error) {
	reservations, err := u.reservationRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list user reservations: %w", err)
	}
	return reservations, nil
}

// ListReservationsInput は予約一覧取得のリクエスト
type ListReservationsInput struct {
	StudioID  string
	StartDate time.Time
	EndDate   time.Time
	Status    *entity.ReservationStatus // オプショナル
}

// ListReservations は予約一覧を取得する（管理用）
// アクセスパターン: AP-03（指定月の予約一覧）, AP-24（予約一覧取得）, AP-38（カレンダー表示用）
func (u *ReservationUsecase) ListReservations(ctx context.Context, input ListReservationsInput) ([]*entity.Reservation, error) {
	if input.Status != nil {
		// ステータス指定がある場合
		return u.reservationRepo.FindByStudioAndStatus(ctx, input.StudioID, *input.Status)
	}
	// ステータス指定がない場合は日付範囲で取得
	reservations, err := u.reservationRepo.FindByStudioAndDateRange(ctx, input.StudioID, input.StartDate, input.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to list reservations: %w", err)
	}
	return reservations, nil
}

// UpdateReservationInput は予約内容編集のリクエスト
type UpdateReservationInput struct {
	ReservationID   string
	Date            *time.Time
	StartTime       *string
	EndTime         *string
	Note            *string
	ShootingDetails *string
}

// UpdateReservation は予約内容を編集する
// アクセスパターン: AP-27（予約内容更新）
//
// ビジネスルール:
// 1. 編集可能ステータスのチェック（pending/tentative/confirmedのみ）
// 2. 日時変更がある場合は重複チェックとブロック枠チェックを実施
func (u *ReservationUsecase) UpdateReservation(ctx context.Context, input UpdateReservationInput) (*entity.Reservation, error) {
	// 1. 既存の予約を取得
	reservation, err := u.reservationRepo.FindByID(ctx, input.ReservationID)
	if err != nil {
		return nil, apierror.ErrReservationNotFound
	}

	// 2. 編集可能ステータスのチェック
	if reservation.Status != entity.ReservationStatusPending &&
		reservation.Status != entity.ReservationStatusTentative &&
		reservation.Status != entity.ReservationStatusConfirmed {
		return nil, apierror.ErrInvalidStatusTransition
	}

	// 3. 日時変更がある場合は重複チェックとブロック枠チェック
	dateChanged := input.Date != nil && !input.Date.Equal(reservation.Date)
	timeChanged := (input.StartTime != nil && *input.StartTime != reservation.StartTime) ||
		(input.EndTime != nil && *input.EndTime != reservation.EndTime)

	if dateChanged || timeChanged {
		newDate := reservation.Date
		if input.Date != nil {
			newDate = *input.Date
		}
		newStartTime := reservation.StartTime
		if input.StartTime != nil {
			newStartTime = *input.StartTime
		}
		newEndTime := reservation.EndTime
		if input.EndTime != nil {
			newEndTime = *input.EndTime
		}

		// ブロック枠チェック
		blockedSlots, err := u.blockedSlotRepo.FindByStudioAndDate(ctx, reservation.StudioID, newDate)
		if err != nil {
			return nil, fmt.Errorf("failed to find blocked slots: %w", err)
		}
		for _, slot := range blockedSlots {
			if slot.IsConflicting(newStartTime, newEndTime) {
				return nil, apierror.ErrBlockedSlotConflict
			}
		}

		// 予約重複チェック（自分自身以外）
		conflictingReservations, err := u.reservationRepo.FindConflicting(ctx, reservation.StudioID, newDate, newStartTime, newEndTime)
		if err != nil {
			return nil, fmt.Errorf("failed to find conflicting reservations: %w", err)
		}
		for _, conflicting := range conflictingReservations {
			if conflicting.ReservationID != reservation.ReservationID {
				return nil, apierror.ErrReservationConflict
			}
		}
	}

	// 4. フィールド更新
	if input.Date != nil {
		reservation.Date = *input.Date
	}
	if input.StartTime != nil {
		reservation.StartTime = *input.StartTime
	}
	if input.EndTime != nil {
		reservation.EndTime = *input.EndTime
	}
	if input.Note != nil {
		reservation.Note = input.Note
	}
	if input.ShootingDetails != nil {
		reservation.ShootingDetails = *input.ShootingDetails
	}
	reservation.UpdatedAt = time.Now()

	// 5. リポジトリに保存
	if err := u.reservationRepo.Update(ctx, reservation); err != nil {
		return nil, fmt.Errorf("failed to update reservation: %w", err)
	}

	return reservation, nil
}

// CancelReservation は予約をキャンセルする
// アクセスパターン: AP-11（予約キャンセル）, AP-28（管理者によるキャンセル）
//
// ビジネスルール:
// 1. キャンセル可能ステータスのチェック（pending/tentative/confirmed/waitlisted/scheduledのみ）
// 2. 第1候補の予約がキャンセルされた場合、第2キープを繰り上げる
func (u *ReservationUsecase) CancelReservation(ctx context.Context, reservationID string, cancelledBy entity.CancelledBy) (*entity.Reservation, error) {
	// 1. 既存の予約を取得
	reservation, err := u.reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		return nil, apierror.ErrReservationNotFound
	}

	// 2. キャンセル可能ステータスのチェック
	if !reservation.CanCancel() {
		return nil, apierror.ErrInvalidStatusTransition
	}

	// 3. キャンセル処理
	now := time.Now()
	reservation.Status = entity.ReservationStatusCancelled
	reservation.CancelledBy = &cancelledBy
	reservation.CancelledAt = &now
	reservation.UpdatedAt = now

	if err := u.reservationRepo.Update(ctx, reservation); err != nil {
		return nil, fmt.Errorf("failed to cancel reservation: %w", err)
	}

	// 4. 第2キープの繰り上げ処理
	// 第1候補（confirmed/tentative）がキャンセルされた場合、第2キープをtentativeに繰り上げる
	if reservation.Status == entity.ReservationStatusCancelled &&
		(reservation.ReservationType == entity.ReservationTypeRegular || reservation.ReservationType == entity.ReservationTypeTentative) {
		secondKeeps, err := u.reservationRepo.FindByLinkedReservationID(ctx, reservationID)
		if err != nil {
			return nil, fmt.Errorf("failed to find second keeps: %w", err)
		}
		for _, secondKeep := range secondKeeps {
			if secondKeep.Status == entity.ReservationStatusWaitlisted {
				// 繰り上げ処理
				promotedFrom := entity.PromotedFromWaitlisted
				secondKeep.Status = entity.ReservationStatusTentative
				secondKeep.PromotedFrom = &promotedFrom
				secondKeep.PromotedAt = &now
				secondKeep.UpdatedAt = now
				if err := u.reservationRepo.Update(ctx, secondKeep); err != nil {
					return nil, fmt.Errorf("failed to promote second keep: %w", err)
				}
			}
		}
	}

	return reservation, nil
}

// ApproveReservation は予約を承認する
// アクセスパターン: AP-19（予約承認）
//
// ビジネスルール:
// 1. 承認可能ステータスのチェック（pendingのみ）
// 2. 予約種別に応じてステータスを変更
//    - regular → confirmed
//    - tentative → tentative
//    - location_scout → scheduled
//    - second_keep → waitlisted
func (u *ReservationUsecase) ApproveReservation(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	// 1. 既存の予約を取得
	reservation, err := u.reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		return nil, apierror.ErrReservationNotFound
	}

	// 2. 承認可能ステータスのチェック
	if !reservation.CanApprove() {
		return nil, apierror.ErrInvalidStatusTransition
	}

	// 3. 予約種別に応じてステータスを変更
	switch reservation.ReservationType {
	case entity.ReservationTypeRegular:
		reservation.Status = entity.ReservationStatusConfirmed
	case entity.ReservationTypeTentative:
		reservation.Status = entity.ReservationStatusTentative
	case entity.ReservationTypeLocationScout:
		reservation.Status = entity.ReservationStatusScheduled
	case entity.ReservationTypeSecondKeep:
		reservation.Status = entity.ReservationStatusWaitlisted
	}

	reservation.UpdatedAt = time.Now()

	if err := u.reservationRepo.Update(ctx, reservation); err != nil {
		return nil, fmt.Errorf("failed to approve reservation: %w", err)
	}

	return reservation, nil
}

// RejectReservation は予約を拒否する（キャンセル扱い）
// アクセスパターン: AP-20（予約拒否）
func (u *ReservationUsecase) RejectReservation(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	// 拒否はオーナーによるキャンセル扱い
	return u.CancelReservation(ctx, reservationID, entity.CancelledByOwner)
}

// PromoteReservation は仮予約を本予約に切り替える
// アクセスパターン: AP-23（仮予約→本予約切替）
//
// ビジネスルール:
// 1. 昇格可能ステータスのチェック（tentativeのみ）
// 2. ステータスをpendingに変更（オーナーの承認待ちになる）
func (u *ReservationUsecase) PromoteReservation(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	// 1. 既存の予約を取得
	reservation, err := u.reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		return nil, apierror.ErrReservationNotFound
	}

	// 2. 昇格可能ステータスのチェック
	if !reservation.CanPromoteToConfirmed() {
		return nil, apierror.ErrInvalidStatusTransition
	}

	// 3. ステータスをpendingに変更（オーナーの承認待ち）
	now := time.Now()
	promotedFrom := entity.PromotedFromTentative
	reservation.Status = entity.ReservationStatusPending
	reservation.PromotedFrom = &promotedFrom
	reservation.PromotedAt = &now
	reservation.UpdatedAt = now

	if err := u.reservationRepo.Update(ctx, reservation); err != nil {
		return nil, fmt.Errorf("failed to promote reservation: %w", err)
	}

	return reservation, nil
}
