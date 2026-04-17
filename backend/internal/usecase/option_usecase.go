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

// OptionUsecase はオプション関連のユースケースを実装
type OptionUsecase struct {
	optionRepo repository.OptionRepository
	studioRepo repository.StudioRepository
}

// NewOptionUsecase は OptionUsecase のコンストラクタ
func NewOptionUsecase(
	optionRepo repository.OptionRepository,
	studioRepo repository.StudioRepository,
) *OptionUsecase {
	return &OptionUsecase{
		optionRepo: optionRepo,
		studioRepo: studioRepo,
	}
}

// ListActiveOptions は有効なオプション一覧を取得する
func (u *OptionUsecase) ListActiveOptions(ctx context.Context, studioID string) ([]*entity.Option, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, studioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. 有効なオプション一覧を取得
	options, err := u.optionRepo.FindActiveByStudioID(ctx, studioID)
	if err != nil {
		return nil, fmt.Errorf("failed to list active options: %w", err)
	}

	return options, nil
}

// CreateOptionInput はオプション作成のリクエスト
type CreateOptionInput struct {
	StudioID     string
	OptionName   string
	Price        int
	TaxRate      float64
	DisplayOrder *int
}

// CreateOption はオプションを作成する
func (u *OptionUsecase) CreateOption(ctx context.Context, input CreateOptionInput) (*entity.Option, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. オプションエンティティを作成
	now := time.Now()
	var displayOrder *int
	if input.DisplayOrder != nil {
		order := *input.DisplayOrder
		displayOrder = &order
	}

	option := &entity.Option{
		StudioID:     input.StudioID,
		OptionID:     uuid.New().String(),
		OptionName:   input.OptionName,
		Price:        input.Price,
		TaxRate:      input.TaxRate,
		IsActive:     true,
		DisplayOrder: displayOrder,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// 3. リポジトリに保存
	if err := u.optionRepo.Create(ctx, option); err != nil {
		return nil, fmt.Errorf("failed to create option: %w", err)
	}

	return option, nil
}

// UpdateOptionInput はオプション更新のリクエスト
type UpdateOptionInput struct {
	StudioID     string
	OptionID     string
	OptionName   *string
	Price        *int
	TaxRate      *float64
	IsActive     *bool
	DisplayOrder *int
}

// UpdateOption はオプションを更新する
func (u *OptionUsecase) UpdateOption(ctx context.Context, input UpdateOptionInput) (*entity.Option, error) {
	// 1. 既存のオプションを取得
	option, err := u.optionRepo.FindByID(ctx, input.StudioID, input.OptionID)
	if err != nil {
		return nil, apierror.ErrOptionNotFound
	}

	// 2. フィールド更新
	if input.OptionName != nil {
		option.OptionName = *input.OptionName
	}
	if input.Price != nil {
		option.Price = *input.Price
	}
	if input.TaxRate != nil {
		option.TaxRate = *input.TaxRate
	}
	if input.IsActive != nil {
		option.IsActive = *input.IsActive
	}
	if input.DisplayOrder != nil {
		order := *input.DisplayOrder
		option.DisplayOrder = &order
	}
	option.UpdatedAt = time.Now()

	// 3. リポジトリに保存
	if err := u.optionRepo.Update(ctx, option); err != nil {
		return nil, fmt.Errorf("failed to update option: %w", err)
	}

	return option, nil
}

// DeleteOption はオプションを削除する（論理削除: is_active=false）
func (u *OptionUsecase) DeleteOption(ctx context.Context, studioID, optionID string) error {
	// 1. 既存のオプションを取得
	_, err := u.optionRepo.FindByID(ctx, studioID, optionID)
	if err != nil {
		return apierror.ErrOptionNotFound
	}

	// 2. 論理削除（is_active=false）
	if err := u.optionRepo.Delete(ctx, studioID, optionID); err != nil {
		return fmt.Errorf("failed to delete option: %w", err)
	}

	return nil
}

// GetOption はオプションを取得する
func (u *OptionUsecase) GetOption(ctx context.Context, studioID, optionID string) (*entity.Option, error) {
	// オプションを取得
	option, err := u.optionRepo.FindByID(ctx, studioID, optionID)
	if err != nil {
		return nil, apierror.ErrOptionNotFound
	}

	return option, nil
}
