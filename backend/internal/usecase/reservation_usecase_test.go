package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// MockReservationRepository は予約リポジトリのモック
type MockReservationRepository struct {
	FindByIDFunc                    func(ctx context.Context, reservationID string) (*entity.Reservation, error)
	FindConflictingFunc             func(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error)
	CreateFunc                      func(ctx context.Context, reservation *entity.Reservation) error
	UpdateFunc                      func(ctx context.Context, reservation *entity.Reservation) error
	FindByStudioAndStatusFunc       func(ctx context.Context, studioID string, status entity.ReservationStatus) ([]*entity.Reservation, error)
	FindByStudioAndDateRangeFunc    func(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error)
}

func (m *MockReservationRepository) FindByID(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, reservationID)
	}
	return nil, apierror.ErrReservationNotFound
}

func (m *MockReservationRepository) FindConflicting(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error) {
	if m.FindConflictingFunc != nil {
		return m.FindConflictingFunc(ctx, studioID, date, startTime, endTime)
	}
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) Create(ctx context.Context, reservation *entity.Reservation) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, reservation)
	}
	return nil
}

func (m *MockReservationRepository) Update(ctx context.Context, reservation *entity.Reservation) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, reservation)
	}
	return nil
}

func (m *MockReservationRepository) FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error) {
	if m.FindByStudioAndDateRangeFunc != nil {
		return m.FindByStudioAndDateRangeFunc(ctx, studioID, startDate, endDate)
	}
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindByStudioAndStatus(ctx context.Context, studioID string, status entity.ReservationStatus) ([]*entity.Reservation, error) {
	if m.FindByStudioAndStatusFunc != nil {
		return m.FindByStudioAndStatusFunc(ctx, studioID, status)
	}
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindByUserID(ctx context.Context, userID string) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindByLinkedReservationID(ctx context.Context, linkedReservationID string) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindExpiredTentative(ctx context.Context, studioID string, expiryDate time.Time) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindUpcomingConfirmed(ctx context.Context, studioID string, date time.Time) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) FindPastConfirmed(ctx context.Context, studioID string, beforeDate time.Time) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

func (m *MockReservationRepository) Delete(ctx context.Context, reservationID string) error {
	return nil
}

func (m *MockReservationRepository) FindByGuestToken(ctx context.Context, guestToken string) (*entity.Reservation, error) {
	return nil, apierror.ErrReservationNotFound
}

func (m *MockReservationRepository) DeleteByKey(ctx context.Context, studioID string, date time.Time, reservationID string) error {
	return nil
}

func strPtr(s string) *string { return &s }

// MockUserRepository はユーザーリポジトリのモック
type MockUserRepository struct {
	FindByIDFunc func(ctx context.Context, userID string) (*entity.User, error)
}

func (m *MockUserRepository) FindByID(ctx context.Context, userID string) (*entity.User, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, userID)
	}
	return &entity.User{
		UserID: userID,
		Name:   "Test User",
		Email:  "test@example.com",
		Role:   entity.UserRoleCustomer,
	}, nil
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	return nil, nil
}

func (m *MockUserRepository) FindAdminsByStudioID(ctx context.Context, studioID string) ([]*entity.User, error) {
	return nil, nil
}

func (m *MockUserRepository) Create(ctx context.Context, user *entity.User) error {
	return nil
}

func (m *MockUserRepository) Update(ctx context.Context, user *entity.User) error {
	return nil
}

func (m *MockUserRepository) Delete(ctx context.Context, userID string) error {
	return nil
}

// MockPlanRepository はプランリポジトリのモック
type MockPlanRepository struct {
	FindByIDFunc func(ctx context.Context, studioID, planID string) (*entity.Plan, error)
}

func (m *MockPlanRepository) FindByID(ctx context.Context, studioID, planID string) (*entity.Plan, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, studioID, planID)
	}
	return &entity.Plan{
		PlanID:   planID,
		StudioID: studioID,
		PlanName: "Test Plan",
		Price:    10000,
		TaxRate:  0.10,
		IsActive: true,
	}, nil
}

func (m *MockPlanRepository) FindByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error) {
	return []*entity.Plan{}, nil
}

func (m *MockPlanRepository) FindActiveByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error) {
	return []*entity.Plan{}, nil
}

func (m *MockPlanRepository) Create(ctx context.Context, plan *entity.Plan) error {
	return nil
}

func (m *MockPlanRepository) Update(ctx context.Context, plan *entity.Plan) error {
	return nil
}

func (m *MockPlanRepository) Delete(ctx context.Context, studioID, planID string) error {
	return nil
}

// MockOptionRepository はオプションリポジトリのモック
type MockOptionRepository struct {
	FindByIDFunc func(ctx context.Context, studioID, optionID string) (*entity.Option, error)
}

func (m *MockOptionRepository) FindByID(ctx context.Context, studioID, optionID string) (*entity.Option, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, studioID, optionID)
	}
	return &entity.Option{
		OptionID:   optionID,
		StudioID:   studioID,
		OptionName: "Test Option",
		Price:      2000,
		TaxRate:    0.10,
		IsActive:   true,
	}, nil
}

func (m *MockOptionRepository) FindByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error) {
	return []*entity.Option{}, nil
}

func (m *MockOptionRepository) FindActiveByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error) {
	return []*entity.Option{}, nil
}

func (m *MockOptionRepository) Create(ctx context.Context, option *entity.Option) error {
	return nil
}

func (m *MockOptionRepository) Update(ctx context.Context, option *entity.Option) error {
	return nil
}

func (m *MockOptionRepository) Delete(ctx context.Context, studioID, optionID string) error {
	return nil
}

// MockBlockedSlotRepository はブロック枠リポジトリのモック
type MockBlockedSlotRepository struct {
	FindByStudioAndDateRangeFunc func(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.BlockedSlot, error)
	FindByStudioAndDateFunc      func(ctx context.Context, studioID string, date time.Time) ([]*entity.BlockedSlot, error)
}

func (m *MockBlockedSlotRepository) FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.BlockedSlot, error) {
	if m.FindByStudioAndDateRangeFunc != nil {
		return m.FindByStudioAndDateRangeFunc(ctx, studioID, startDate, endDate)
	}
	return []*entity.BlockedSlot{}, nil
}

func (m *MockBlockedSlotRepository) FindByStudioAndDate(ctx context.Context, studioID string, date time.Time) ([]*entity.BlockedSlot, error) {
	if m.FindByStudioAndDateFunc != nil {
		return m.FindByStudioAndDateFunc(ctx, studioID, date)
	}
	return []*entity.BlockedSlot{}, nil
}

func (m *MockBlockedSlotRepository) FindByID(ctx context.Context, studioID, blockedSlotID string) (*entity.BlockedSlot, error) {
	return nil, nil
}

func (m *MockBlockedSlotRepository) Create(ctx context.Context, blockedSlot *entity.BlockedSlot) error {
	return nil
}

func (m *MockBlockedSlotRepository) Delete(ctx context.Context, studioID, blockedSlotID string) error {
	return nil
}

func (m *MockBlockedSlotRepository) Update(ctx context.Context, blockedSlot *entity.BlockedSlot) error {
	return nil
}

// MockStudioRepository はスタジオリポジトリのモック
type MockStudioRepository struct {
	FindByIDFunc func(ctx context.Context, studioID string) (*entity.Studio, error)
}

func (m *MockStudioRepository) FindByID(ctx context.Context, studioID string) (*entity.Studio, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, studioID)
	}
	return &entity.Studio{
		StudioID:            studioID,
		StudioName:          "Test Studio",
		TentativeExpiryDays: 7,
		IsActive:            true,
	}, nil
}

func (m *MockStudioRepository) Create(ctx context.Context, studio *entity.Studio) error {
	return nil
}

func (m *MockStudioRepository) Update(ctx context.Context, studio *entity.Studio) error {
	return nil
}

func (m *MockStudioRepository) Delete(ctx context.Context, studioID string) error {
	return nil
}

// TestCreateReservation_Success は予約作成が成功するケースをテスト
func TestCreateReservation_Success(t *testing.T) {
	// テストケース: 正常系（予約作成成功）

	// 1. モックリポジトリを準備
	reservationRepo := &MockReservationRepository{
		FindConflictingFunc: func(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error) {
			// 重複する予約がないケース
			return []*entity.Reservation{}, nil
		},
	}
	userRepo := &MockUserRepository{}
	planRepo := &MockPlanRepository{}
	blockedSlotRepo := &MockBlockedSlotRepository{}
	studioRepo := &MockStudioRepository{}

	// 2. ユースケースを作成
	usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

	// 3. 予約作成リクエストを準備
	input := CreateReservationInput{
		StudioID:        "studio_001",
		UserID:          strPtr("user_001"),
		ReservationType: entity.ReservationTypeRegular,
		PlanID:          "plan_001",
		Date:      time.Now().AddDate(0, 0, 7), // 7日後
		StartTime: "10:00",
		EndTime:   "12:00",
	}

	// 4. 予約を作成
	reservation, err := usecase.CreateReservation(context.Background(), input)

	// 5. 検証
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if reservation == nil {
		t.Fatal("Expected reservation, got nil")
	}
	if reservation.StudioID != input.StudioID {
		t.Errorf("StudioID = %v, want %v", reservation.StudioID, input.StudioID)
	}
	if reservation.UserID != input.UserID {
		t.Errorf("UserID = %v, want %v", reservation.UserID, input.UserID)
	}
	if reservation.Status != entity.ReservationStatusPending {
		t.Errorf("Status = %v, want %v", reservation.Status, entity.ReservationStatusPending)
	}
}

// TestCreateReservation_Conflict は予約重複時にエラーを返すかテスト
func TestCreateReservation_Conflict(t *testing.T) {
	// テストケース: 同一時間帯に既存予約がある場合、エラーを返すか

	// 1. モックリポジトリを準備（重複する予約があるケース）
	reservationRepo := &MockReservationRepository{
		FindConflictingFunc: func(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error) {
			// 重複する予約が存在
			return []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      studioID,
					Status:        entity.ReservationStatusConfirmed,
				},
			}, nil
		},
	}
	userRepo := &MockUserRepository{}
	planRepo := &MockPlanRepository{}
	blockedSlotRepo := &MockBlockedSlotRepository{}
	studioRepo := &MockStudioRepository{}

	// 2. ユースケースを作成
	usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

	// 3. 予約作成リクエストを準備
	input := CreateReservationInput{
		StudioID:        "studio_001",
		UserID:          strPtr("user_001"),
		ReservationType: entity.ReservationTypeRegular,
		PlanID:    "plan_001",
		Date:      time.Now().AddDate(0, 0, 7),
		StartTime: "10:00",
		EndTime:   "12:00",
	}

	// 4. 予約を作成
	reservation, err := usecase.CreateReservation(context.Background(), input)

	// 5. 検証
	if err != apierror.ErrReservationConflict {
		t.Errorf("Expected ErrReservationConflict, got %v", err)
	}
	if reservation != nil {
		t.Error("Expected nil reservation on conflict")
	}
}

// TestApproveReservation_Success は予約承認が成功するケースをテスト
func TestApproveReservation_Success(t *testing.T) {
	// テストケース: pending状態の予約を承認できるか

	// 1. モックリポジトリを準備
	reservationRepo := &MockReservationRepository{
		FindByIDFunc: func(ctx context.Context, reservationID string) (*entity.Reservation, error) {
			// pending状態の予約を返す
			return &entity.Reservation{
				ReservationID:   reservationID,
				StudioID:        "studio_001",
				UserID:          strPtr("user_001"),
				ReservationType: entity.ReservationTypeRegular,
				Status:          entity.ReservationStatusPending,
				Date:            time.Now().AddDate(0, 0, 7),
				StartTime:       "10:00",
				EndTime:         "12:00",
			}, nil
		},
	}
	userRepo := &MockUserRepository{}
	planRepo := &MockPlanRepository{}
	blockedSlotRepo := &MockBlockedSlotRepository{}
	studioRepo := &MockStudioRepository{}

	// 2. ユースケースを作成
	usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

	// 3. 予約を承認
	reservation, err := usecase.ApproveReservation(context.Background(), "rsv_001")

	// 4. 検証
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if reservation == nil {
		t.Fatal("Expected reservation, got nil")
	}
	// 本予約の場合はconfirmed、仮予約の場合はtentativeになる
	if reservation.Status != entity.ReservationStatusConfirmed && reservation.Status != entity.ReservationStatusTentative {
		t.Errorf("Status = %v, want confirmed or tentative", reservation.Status)
	}
}

// TestRejectReservation_Success は予約拒否が成功するケースをテスト
func TestRejectReservation_Success(t *testing.T) {
	// テストケース: pending状態の予約を拒否できるか

	// 1. モックリポジトリを準備
	reservationRepo := &MockReservationRepository{
		FindByIDFunc: func(ctx context.Context, reservationID string) (*entity.Reservation, error) {
			// pending状態の予約を返す
			return &entity.Reservation{
				ReservationID:   reservationID,
				StudioID:        "studio_001",
				UserID:          strPtr("user_001"),
				ReservationType: entity.ReservationTypeRegular,
				Status:          entity.ReservationStatusPending,
			}, nil
		},
	}
	userRepo := &MockUserRepository{}
	planRepo := &MockPlanRepository{}
	blockedSlotRepo := &MockBlockedSlotRepository{}
	studioRepo := &MockStudioRepository{}

	// 2. ユースケースを作成
	usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

	// 3. 予約を拒否
	reservation, err := usecase.RejectReservation(context.Background(), "rsv_001")

	// 4. 検証
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if reservation == nil {
		t.Fatal("Expected reservation, got nil")
	}
	if reservation.Status != entity.ReservationStatusCancelled {
		t.Errorf("Status = %v, want cancelled", reservation.Status)
	}
}

// TestPromoteReservation_Success は仮予約→本予約の昇格が成功するケースをテスト
func TestPromoteReservation_Success(t *testing.T) {
	// テストケース: tentative状態の予約をpendingに昇格できるか

	// 1. モックリポジトリを準備
	reservationRepo := &MockReservationRepository{
		FindByIDFunc: func(ctx context.Context, reservationID string) (*entity.Reservation, error) {
			// tentative状態の予約を返す
			return &entity.Reservation{
				ReservationID:   reservationID,
				StudioID:        "studio_001",
				UserID:          strPtr("user_001"),
				ReservationType: entity.ReservationTypeTentative,
				Status:          entity.ReservationStatusTentative,
				Date:            time.Now().AddDate(0, 0, 7),
			}, nil
		},
	}
	userRepo := &MockUserRepository{}
	planRepo := &MockPlanRepository{}
	blockedSlotRepo := &MockBlockedSlotRepository{}
	studioRepo := &MockStudioRepository{}

	// 2. ユースケースを作成
	usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

	// 3. 予約を昇格
	reservation, err := usecase.PromoteReservation(context.Background(), "rsv_001")

	// 4. 検証
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if reservation == nil {
		t.Fatal("Expected reservation, got nil")
	}
	if reservation.Status != entity.ReservationStatusPending {
		t.Errorf("Status = %v, want pending", reservation.Status)
	}
}

// TestCreateReservation_BufferTimeConflict は前後 59 分以内制約のテスト
// （ちょうど 60 分隙間が空けば許可される）
func TestCreateReservation_BufferTimeConflict(t *testing.T) {
	testDate := time.Date(2024, 4, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name            string
		reservationType entity.ReservationType
		startTime       string
		endTime         string
		existingReservations []*entity.Reservation
		wantError       bool
		errorType       *apierror.APIError
	}{
		{
			name:            "本予約: 既存予約との隙間が 59 分 → エラー",
			reservationType: entity.ReservationTypeRegular,
			startTime:       "09:01",
			endTime:         "10:01",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: true,
			errorType: apierror.ErrBufferTimeConflict,
		},
		{
			name:            "本予約: 既存予約との後ろ隙間が 59 分 → エラー",
			reservationType: entity.ReservationTypeRegular,
			startTime:       "13:59",
			endTime:         "14:59",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: true,
			errorType: apierror.ErrBufferTimeConflict,
		},
		{
			name:            "本予約: 既存予約とちょうど 60 分隙間 → OK",
			reservationType: entity.ReservationTypeRegular,
			startTime:       "09:00",
			endTime:         "10:00",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: false,
		},
		{
			name:            "本予約: 既存予約から2時間前 → OK",
			reservationType: entity.ReservationTypeRegular,
			startTime:       "08:00",
			endTime:         "09:00",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: false,
		},
		{
			name:            "第2キープ: 隙間 59 分 → OK（制約なし）",
			reservationType: entity.ReservationTypeSecondKeep,
			startTime:       "09:01",
			endTime:         "10:01",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: false,
		},
		{
			name:            "ロケハン: 隙間 59 分 → OK（制約なし）",
			reservationType: entity.ReservationTypeLocationScout,
			startTime:       "09:01",
			endTime:         "10:01",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusConfirmed,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: false,
		},
		{
			name:            "仮予約: 既存仮予約との隙間 59 分 → 第2キープのみ可エラー",
			reservationType: entity.ReservationTypeTentative,
			startTime:       "09:01",
			endTime:         "10:01",
			existingReservations: []*entity.Reservation{
				{
					ReservationID: "rsv_existing",
					StudioID:      "studio_001",
					Status:        entity.ReservationStatusTentative,
					Date:          testDate,
					StartTime:     "11:00",
					EndTime:       "13:00",
				},
			},
			wantError: true,
			errorType: apierror.ErrSecondKeepOnly,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// モックリポジトリを準備
			reservationRepo := &MockReservationRepository{
				FindByStudioAndDateRangeFunc: func(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error) {
					return tt.existingReservations, nil
				},
				FindConflictingFunc: func(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error) {
					// 第2キープの場合は既存予約を返す、それ以外は空
					if tt.reservationType == entity.ReservationTypeSecondKeep {
						return tt.existingReservations, nil
					}
					return []*entity.Reservation{}, nil
				},
			}
			userRepo := &MockUserRepository{}
			planRepo := &MockPlanRepository{}
			blockedSlotRepo := &MockBlockedSlotRepository{}
			studioRepo := &MockStudioRepository{
				FindByIDFunc: func(ctx context.Context, studioID string) (*entity.Studio, error) {
					return &entity.Studio{
						StudioID:        studioID,
						StudioName:      "Test Studio",
						RegularHolidays: []string{},
					}, nil
				},
			}

			usecase := NewReservationUsecase(reservationRepo, userRepo, planRepo, &MockOptionRepository{}, blockedSlotRepo, studioRepo)

			// 予約作成を試行
			userID := "user_001"
			input := CreateReservationInput{
				StudioID:           "studio_001",
				UserID:             &userID,
				ReservationType:    tt.reservationType,
				PlanID:             "plan_001",
				Date:               testDate,
				StartTime:          tt.startTime,
				EndTime:            tt.endTime,
				Options:            []string{},
				ShootingType:       []string{"stills"},
				ShootingDetails:    "Test shooting",
				PhotographerName:   "Test Photographer",
				NumberOfPeople:     1,
				NeedsProtection:    false,
				EquipmentInsurance: true,
			}

			_, err := usecase.CreateReservation(context.Background(), input)

			// 検証
			if tt.wantError {
				if err == nil {
					t.Fatalf("Expected error, got nil")
				}
				if tt.errorType != nil && err != tt.errorType {
					t.Errorf("Expected error %v, got %v", tt.errorType, err)
				}
			} else {
				if err != nil {
					t.Fatalf("Expected no error, got %v", err)
				}
			}
		})
	}
}

// TestEvaluateAvailability は3値可用性判定（不可 / 第2キープのみ可 / 通常）の純粋関数テスト
// すべて半開区間 [start, end)。ゾーン = [existingStart-1h, existingEnd+1h)。
func TestEvaluateAvailability(t *testing.T) {
	// reg は confirmed（本予約 → 不可ゾーン）の既存予約を生成する
	reg := func(st, et string) *entity.Reservation {
		return &entity.Reservation{Status: entity.ReservationStatusConfirmed, StartTime: st, EndTime: et}
	}
	// ten は tentative（仮予約 → キープゾーン）の既存予約を生成する
	ten := func(st, et string) *entity.Reservation {
		return &entity.Reservation{Status: entity.ReservationStatusTentative, StartTime: st, EndTime: et}
	}

	tests := []struct {
		name     string
		reqStart string
		reqEnd   string
		existing []*entity.Reservation
		want     AvailabilityResult
	}{
		// --- 基準①: 本予約 10:00-18:00（ゾーン[09:00,19:00)） ---
		{"本予約10-18, req09-19跨ぎ → 不可", "09:00", "19:00", []*entity.Reservation{reg("10:00", "18:00")}, AvailabilityUnavailable},
		{"本予約10-18, req内部11-12 → 不可", "11:00", "12:00", []*entity.Reservation{reg("10:00", "18:00")}, AvailabilityUnavailable},
		{"本予約10-18, req08-09終端がゾーン始点09:00接触 → 通常(半開)", "08:00", "09:00", []*entity.Reservation{reg("10:00", "18:00")}, AvailabilityNormal},
		{"本予約10-18, req19-20始点がゾーン終端19:00接触 → 通常(半開)", "19:00", "20:00", []*entity.Reservation{reg("10:00", "18:00")}, AvailabilityNormal},
		{"本予約10-18, req08:30-09:30ゾーン始点跨ぎ → 不可", "08:30", "09:30", []*entity.Reservation{reg("10:00", "18:00")}, AvailabilityUnavailable},

		// --- 基準②: 仮予約 10:00-18:00（ゾーン[09:00,19:00)） ---
		{"仮予約10-18, req09-19跨ぎ → 第2キープのみ可", "09:00", "19:00", []*entity.Reservation{ten("10:00", "18:00")}, AvailabilitySecondKeepOnly},
		{"仮予約10-18, req07-08圏外 → 通常", "07:00", "08:00", []*entity.Reservation{ten("10:00", "18:00")}, AvailabilityNormal},
		{"仮予約10-18, req19-20ゾーン終端接触 → 通常(半開)", "19:00", "20:00", []*entity.Reservation{ten("10:00", "18:00")}, AvailabilityNormal},

		// --- 基準③: 混在 本予約10:00-12:00（ゾーン[09:00,13:00)） + 仮予約13:00-15:00（ゾーン[12:00,16:00)） ---
		{"混在, req09-13 → 不可(本予約ゾーン)", "09:00", "13:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilityUnavailable},
		{"混在, req13-16 → 第2キープのみ可(仮予約ゾーンのみ)", "13:00", "16:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilitySecondKeepOnly},
		{"混在, req06-08圏外 → 通常", "06:00", "08:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilityNormal},
		{"混在, req12-13重複区間 → 不可(本予約優先)", "12:00", "13:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilityUnavailable},
		{"混在, req13-14本予約ゾーン終端13:00ちょうど開始 → 第2キープのみ可(半開で本予約側は非ヒット)", "13:00", "14:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilitySecondKeepOnly},
		{"混在, req09-16両ゾーン跨ぎ → 不可(厳しい方優先)", "09:00", "16:00", []*entity.Reservation{reg("10:00", "12:00"), ten("13:00", "15:00")}, AvailabilityUnavailable},

		// --- 基準④: 境界ケース ---
		{"本予約10-12, req13-14ゾーン終端13:00ちょうど(gap60) → 通常(半開境界)", "13:00", "14:00", []*entity.Reservation{reg("10:00", "12:00")}, AvailabilityNormal},
		{"本予約10-12, req12:30-13:30ゾーン内(gap30) → 不可", "12:30", "13:30", []*entity.Reservation{reg("10:00", "12:00")}, AvailabilityUnavailable},

		// --- 日跨ぎ（24時超） ---
		{"本予約24-26(ゾーン[23:00,27:00)), req25-26 → 不可", "25:00", "26:00", []*entity.Reservation{reg("24:00", "26:00")}, AvailabilityUnavailable},
		{"本予約24-26, req22-23終端がゾーン始点23:00接触 → 通常(半開)", "22:00", "23:00", []*entity.Reservation{reg("24:00", "26:00")}, AvailabilityNormal},

		// --- ゾーン非生成ステータス・空 ---
		{"pending既存はゾーン非生成 → 通常", "09:00", "19:00", []*entity.Reservation{{Status: entity.ReservationStatusPending, StartTime: "10:00", EndTime: "18:00"}}, AvailabilityNormal},
		{"既存なし → 通常", "10:00", "12:00", nil, AvailabilityNormal},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := evaluateAvailability(tt.reqStart, tt.reqEnd, tt.existing); got != tt.want {
				t.Errorf("evaluateAvailability(%s, %s) = %v, want %v", tt.reqStart, tt.reqEnd, got, tt.want)
			}
		})
	}
}
