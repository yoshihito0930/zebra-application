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

// InquiryUsecase は問い合わせ関連のユースケースを実装
type InquiryUsecase struct {
	inquiryRepo repository.InquiryRepository
	userRepo    repository.UserRepository
	studioRepo  repository.StudioRepository
}

// NewInquiryUsecase は InquiryUsecase のコンストラクタ
func NewInquiryUsecase(
	inquiryRepo repository.InquiryRepository,
	userRepo repository.UserRepository,
	studioRepo repository.StudioRepository,
) *InquiryUsecase {
	return &InquiryUsecase{
		inquiryRepo: inquiryRepo,
		userRepo:    userRepo,
		studioRepo:  studioRepo,
	}
}

// CreateInquiryInput は問い合わせ作成のリクエスト
type CreateInquiryInput struct {
	StudioID      string
	UserID        string
	InquiryTitle  string
	InquiryDetail string
}

// CreateInquiry は問い合わせを作成する
// アクセスパターン: AP-14（問い合わせ作成）
func (u *InquiryUsecase) CreateInquiry(ctx context.Context, input CreateInquiryInput) (*entity.Inquiry, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. ユーザーの存在確認
	_, err = u.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return nil, apierror.ErrUserNotFound
	}

	// 3. 問い合わせエンティティを作成
	now := time.Now()
	inquiry := &entity.Inquiry{
		InquiryID:      uuid.New().String(),
		StudioID:       input.StudioID,
		UserID:         input.UserID,
		InquiryTitle:   input.InquiryTitle,
		InquiryDetail:  input.InquiryDetail,
		InquiryStatus:  entity.InquiryStatusOpen,
		ReplyDetail:    nil,
		RepliedAt:      nil,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// 4. リポジトリに保存
	if err := u.inquiryRepo.Create(ctx, inquiry); err != nil {
		return nil, fmt.Errorf("failed to create inquiry: %w", err)
	}

	return inquiry, nil
}

// ListUserInquiries は自分の問い合わせ一覧を取得する
// アクセスパターン: AP-15（自分の問い合わせ一覧取得）
func (u *InquiryUsecase) ListUserInquiries(ctx context.Context, userID string) ([]*entity.Inquiry, error) {
	// 1. ユーザーの存在確認
	_, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, apierror.ErrUserNotFound
	}

	// 2. 問い合わせ一覧を取得
	inquiries, err := u.inquiryRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list user inquiries: %w", err)
	}

	return inquiries, nil
}

// ListInquiriesInput は問い合わせ一覧取得のリクエスト（管理用）
type ListInquiriesInput struct {
	StudioID string
	Status   *entity.InquiryStatus // オプショナル
}

// ListInquiries は問い合わせ一覧を取得する（管理用）
// アクセスパターン: AP-36（未回答の問い合わせ一覧取得）
func (u *InquiryUsecase) ListInquiries(ctx context.Context, input ListInquiriesInput) ([]*entity.Inquiry, error) {
	// 1. スタジオの存在確認
	_, err := u.studioRepo.FindByID(ctx, input.StudioID)
	if err != nil {
		return nil, apierror.ErrStudioNotFound
	}

	// 2. ステータス指定がある場合はステータス別に取得
	if input.Status != nil {
		inquiries, err := u.inquiryRepo.FindByStudioAndStatus(ctx, input.StudioID, *input.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to list inquiries by status: %w", err)
		}
		return inquiries, nil
	}

	// 3. ステータス指定がない場合は全件取得（全ステータスを取得）
	// NOTE: DynamoDBの制約上、全ステータスを個別に取得して結合する必要がある
	var allInquiries []*entity.Inquiry
	statuses := []entity.InquiryStatus{
		entity.InquiryStatusOpen,
		entity.InquiryStatusReplied,
		entity.InquiryStatusClosed,
	}
	for _, status := range statuses {
		inquiries, err := u.inquiryRepo.FindByStudioAndStatus(ctx, input.StudioID, status)
		if err != nil {
			return nil, fmt.Errorf("failed to list inquiries: %w", err)
		}
		allInquiries = append(allInquiries, inquiries...)
	}

	return allInquiries, nil
}

// ReplyInquiryInput は問い合わせ回答のリクエスト
type ReplyInquiryInput struct {
	StudioID    string
	InquiryID   string
	ReplyDetail string
}

// ReplyInquiry は問い合わせに回答する
// アクセスパターン: AP-37（問い合わせに回答）
//
// ビジネスルール:
// 1. 問い合わせのステータスがopenであることを確認
func (u *InquiryUsecase) ReplyInquiry(ctx context.Context, input ReplyInquiryInput) (*entity.Inquiry, error) {
	// 1. 既存の問い合わせを取得
	inquiry, err := u.inquiryRepo.FindByID(ctx, input.StudioID, input.InquiryID)
	if err != nil {
		return nil, apierror.ErrInquiryNotFound
	}

	// 2. ステータスがopenであることを確認（replied/closedの場合はエラー）
	if inquiry.InquiryStatus != entity.InquiryStatusOpen {
		return nil, apierror.ErrInvalidStatusTransition
	}

	// 3. 回答を設定
	now := time.Now()
	inquiry.ReplyDetail = &input.ReplyDetail
	inquiry.RepliedAt = &now
	inquiry.InquiryStatus = entity.InquiryStatusReplied
	inquiry.UpdatedAt = now

	// 4. リポジトリに保存
	if err := u.inquiryRepo.Update(ctx, inquiry); err != nil {
		return nil, fmt.Errorf("failed to reply inquiry: %w", err)
	}

	return inquiry, nil
}
