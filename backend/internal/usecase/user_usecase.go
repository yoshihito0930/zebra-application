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

// UserUsecase はユーザー関連のユースケースを実装
type UserUsecase struct {
	userRepo   repository.UserRepository
	studioRepo repository.StudioRepository
}

// NewUserUsecase は UserUsecase のコンストラクタ
func NewUserUsecase(
	userRepo repository.UserRepository,
	studioRepo repository.StudioRepository,
) *UserUsecase {
	return &UserUsecase{
		userRepo:   userRepo,
		studioRepo: studioRepo,
	}
}

// SignupInput はユーザー登録のリクエスト
type SignupInput struct {
	Name        string
	Email       string
	Password    string
	PhoneNumber string
	CompanyName *string
	Address     string
}

// Signup はユーザーを登録する
// アクセスパターン: AP-01（ユーザー登録）, AP-02（メールアドレス重複チェック）
//
// ビジネスルール:
// 1. メールアドレスの重複チェック
// 2. パスワードのハッシュ化（実際にはCognitoで実施）
func (u *UserUsecase) Signup(ctx context.Context, input SignupInput) (*entity.User, error) {
	// 1. メールアドレスの重複チェック
	existingUser, err := u.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email duplication: %w", err)
	}
	if existingUser != nil {
		return nil, apierror.ErrEmailAlreadyExists
	}

	// 2. ユーザーエンティティを作成
	now := time.Now()
	user := &entity.User{
		UserID:      uuid.New().String(),
		Name:        input.Name,
		Email:       input.Email,
		PhoneNumber: input.PhoneNumber,
		CompanyName: input.CompanyName,
		Address:     input.Address,
		Role:        entity.UserRoleCustomer, // デフォルトはcustomer
		StudioID:    nil,                      // customerはスタジオに所属しない
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// 3. リポジトリに保存
	// NOTE: パスワードのハッシュ化はCognitoで実施されるため、ここでは保存しない
	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetProfile はプロフィールを取得する
func (u *UserUsecase) GetProfile(ctx context.Context, userID string) (*entity.User, error) {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, apierror.ErrUserNotFound
	}
	return user, nil
}

// UpdateProfileInput はプロフィール更新のリクエスト
type UpdateProfileInput struct {
	UserID      string
	PhoneNumber *string
	CompanyName *string
	Address     *string
}

// UpdateProfile はプロフィールを更新する
func (u *UserUsecase) UpdateProfile(ctx context.Context, input UpdateProfileInput) (*entity.User, error) {
	// 1. 既存のユーザーを取得
	user, err := u.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return nil, apierror.ErrUserNotFound
	}

	// 2. フィールド更新
	if input.PhoneNumber != nil {
		user.PhoneNumber = *input.PhoneNumber
	}
	if input.CompanyName != nil {
		user.CompanyName = input.CompanyName
	}
	if input.Address != nil {
		user.Address = *input.Address
	}
	user.UpdatedAt = time.Now()

	// 3. リポジトリに保存
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return user, nil
}

// GetUser はユーザー詳細を取得する（管理用）
// アクセスパターン: AP-26（予約者情報取得）
func (u *UserUsecase) GetUser(ctx context.Context, userID string) (*entity.User, error) {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, apierror.ErrUserNotFound
	}
	return user, nil
}

// CreateStaffInput はスタッフユーザー登録のリクエスト
type CreateStaffInput struct {
	StudioID    string
	Name        string
	Email       string
	Password    string
	PhoneNumber string
}

// CreateStaff はスタッフユーザーを登録する
// アクセスパターン: AP-16（スタッフユーザー作成）
//
// ビジネスルール:
// 1. メールアドレスの重複チェック
// 2. スタジオの存在確認
func (u *UserUsecase) CreateStaff(ctx context.Context, input CreateStaffInput) (*entity.User, error) {
	// 1. メールアドレスの重複チェック
	existingUser, err := u.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email duplication: %w", err)
	}
	if existingUser != nil {
		return nil, apierror.ErrEmailAlreadyExists
	}

	// 2. スタジオの存在確認
	_, err = u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 3. スタッフユーザーエンティティを作成
	now := time.Now()
	user := &entity.User{
		UserID:      uuid.New().String(),
		Name:        input.Name,
		Email:       input.Email,
		PhoneNumber: input.PhoneNumber,
		CompanyName: nil,
		Address:     "",
		Role:        entity.UserRoleStaff, // ロールはstaff
		StudioID:    &input.StudioID,  // スタジオIDを設定
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// 4. リポジトリに保存
	// NOTE: パスワードのハッシュ化はCognitoで実施されるため、ここでは保存しない
	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create staff: %w", err)
	}

	return user, nil
}
