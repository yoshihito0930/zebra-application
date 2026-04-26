package dynamodb

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// InquiryRepositoryImpl はInquiryRepositoryのDynamoDB実装
type InquiryRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewInquiryRepository はInquiryRepositoryの新しいインスタンスを作成する
func NewInquiryRepository(client *dynamodb.Client) repository.InquiryRepository {
	return &InquiryRepositoryImpl{
		client:    client,
		tableName: "inquiries",
	}
}

// Create は問い合わせを作成する
func (r *InquiryRepositoryImpl) Create(ctx context.Context, inquiry *entity.Inquiry) error {
	item, err := attributevalue.MarshalMap(inquiry)
	if err != nil {
		return fmt.Errorf("failed to marshal inquiry: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put inquiry item: %w", err)
	}

	return nil
}

// FindByID は問い合わせIDで問い合わせを取得する
// DynamoDBキー: PK=studio_id, SK=inquiry_id
func (r *InquiryRepositoryImpl) FindByID(ctx context.Context, studioID, inquiryID string) (*entity.Inquiry, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":  &types.AttributeValueMemberS{Value: studioID},
			"inquiry_id": &types.AttributeValueMemberS{Value: inquiryID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get inquiry item: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("inquiry not found: studio_id=%s, inquiry_id=%s", studioID, inquiryID)
	}

	var inquiry entity.Inquiry
	err = attributevalue.UnmarshalMap(result.Item, &inquiry)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal inquiry: %w", err)
	}

	return &inquiry, nil
}

// FindByUserID はユーザー別問い合わせ一覧を取得する
// DynamoDBキー: GSI2（PK=user_id, SK=created_at）を使用
// アクセスパターン: AP-15（自分の問い合わせ一覧取得）
func (r *InquiryRepositoryImpl) FindByUserID(ctx context.Context, userID string) ([]*entity.Inquiry, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI2"),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query inquiries by user: %w", err)
	}

	inquiries := make([]*entity.Inquiry, 0, len(result.Items))
	for _, item := range result.Items {
		var inquiry entity.Inquiry
		err := attributevalue.UnmarshalMap(item, &inquiry)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal inquiry: %w", err)
		}
		inquiries = append(inquiries, &inquiry)
	}

	return inquiries, nil
}

// FindByStudioAndStatus はステータス別問い合わせ一覧を取得する
// DynamoDBキー: GSI1（PK=studio_id_status, SK=created_at）を使用
// アクセスパターン: AP-36（未回答の問い合わせ一覧取得）
func (r *InquiryRepositoryImpl) FindByStudioAndStatus(ctx context.Context, studioID string, status entity.InquiryStatus) ([]*entity.Inquiry, error) {
	gsi1PK := fmt.Sprintf("%s#%s", studioID, status)

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("studio_id_status = :pk"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: gsi1PK},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query inquiries by status: %w", err)
	}

	inquiries := make([]*entity.Inquiry, 0, len(result.Items))
	for _, item := range result.Items {
		var inquiry entity.Inquiry
		err := attributevalue.UnmarshalMap(item, &inquiry)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal inquiry: %w", err)
		}
		inquiries = append(inquiries, &inquiry)
	}

	return inquiries, nil
}

// Update は問い合わせを更新する
// アクセスパターン: AP-37（問い合わせに回答）
func (r *InquiryRepositoryImpl) Update(ctx context.Context, inquiry *entity.Inquiry) error {
	item, err := attributevalue.MarshalMap(inquiry)
	if err != nil {
		return fmt.Errorf("failed to marshal inquiry: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update inquiry item: %w", err)
	}

	return nil
}

// Delete は問い合わせを削除する（物理削除）
func (r *InquiryRepositoryImpl) Delete(ctx context.Context, studioID, inquiryID string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":  &types.AttributeValueMemberS{Value: studioID},
			"inquiry_id": &types.AttributeValueMemberS{Value: inquiryID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete inquiry item: %w", err)
	}

	return nil
}
