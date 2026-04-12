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

// PlanUsecase はプラン関連のユースケースを実装
type PlanUsecase struct {
	planRepo   repository.PlanRepository
	studioRepo repository.StudioRepository
}

// NewPlanUsecase は PlanUsecase のコンストラクタ
func NewPlanUsecase(
	planRepo repository.PlanRepository,
	studioRepo repository.StudioRepository,
) *PlanUsecase {
	return &PlanUsecase{
		planRepo:   planRepo,
		studioRepo: studioRepo,
	}
}

// ListActivePlans は有効なプラン一覧を取得する
// アクセスパターン: AP-50（有効なプラン一覧取得）
func (u *PlanUsecase) ListActivePlans(ctx context.Context, studioID string) ([]*entity.Plan, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, studioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. 有効なプラン一覧を取得
	plans, err := u.planRepo.FindActiveByStudio(ctx, studioID)
	if err != nil {
		return nil, fmt.Errorf("failed to list active plans: %w", err)
	}

	return plans, nil
}

// CreatePlanInput はプラン作成のリクエスト
type CreatePlanInput struct {
	StudioID     string
	PlanName     string
	Description  *string
	Price        int
	TaxRate      float64
	DisplayOrder *int
}

// CreatePlan はプランを作成する
// アクセスパターン: AP-33（プラン作成）
func (u *PlanUsecase) CreatePlan(ctx context.Context, input CreatePlanInput) (*entity.Plan, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. プランエンティティを作成
	now := time.Now()
	displayOrder := 0
	if input.DisplayOrder != nil {
		displayOrder = *input.DisplayOrder
	}

	plan := &entity.Plan{
		StudioID:     input.StudioID,
		PlanID:       uuid.New().String(),
		PlanName:     input.PlanName,
		Description:  input.Description,
		Price:        input.Price,
		TaxRate:      input.TaxRate,
		IsActive:     true,
		DisplayOrder: displayOrder,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// 3. リポジトリに保存
	if err := u.planRepo.Create(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to create plan: %w", err)
	}

	return plan, nil
}

// UpdatePlanInput はプラン更新のリクエスト
type UpdatePlanInput struct {
	StudioID     string
	PlanID       string
	PlanName     *string
	Description  *string
	Price        *int
	TaxRate      *float64
	IsActive     *bool
	DisplayOrder *int
}

// UpdatePlan はプランを更新する
// アクセスパターン: AP-33（プラン更新）
func (u *PlanUsecase) UpdatePlan(ctx context.Context, input UpdatePlanInput) (*entity.Plan, error) {
	// 1. 既存のプランを取得
	plan, err := u.planRepo.FindByID(ctx, input.StudioID, input.PlanID)
	if err != nil {
		return nil, apierror.ErrPlanNotFound
	}

	// 2. フィールド更新
	if input.PlanName != nil {
		plan.PlanName = *input.PlanName
	}
	if input.Description != nil {
		plan.Description = input.Description
	}
	if input.Price != nil {
		plan.Price = *input.Price
	}
	if input.TaxRate != nil {
		plan.TaxRate = *input.TaxRate
	}
	if input.IsActive != nil {
		plan.IsActive = *input.IsActive
	}
	if input.DisplayOrder != nil {
		plan.DisplayOrder = *input.DisplayOrder
	}
	plan.UpdatedAt = time.Now()

	// 3. リポジトリに保存
	if err := u.planRepo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to update plan: %w", err)
	}

	return plan, nil
}
