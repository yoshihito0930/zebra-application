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

// StudioRepositoryImpl はStudioRepositoryのDynamoDB実装
type StudioRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewStudioRepository はStudioRepositoryの新しいインスタンスを作成する
func NewStudioRepository(client *dynamodb.Client) repository.StudioRepository {
	return &StudioRepositoryImpl{
		client:    client,
		tableName: GetTableName("studios"),
	}
}

// FindByID はスタジオIDでスタジオを取得する
func (r *StudioRepositoryImpl) FindByID(ctx context.Context, studioID string) (*entity.Studio, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get studio item: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("studio not found: %s", studioID)
	}

	var studio entity.Studio
	err = attributevalue.UnmarshalMap(result.Item, &studio)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal studio: %w", err)
	}

	return &studio, nil
}

// Create はスタジオを作成する
func (r *StudioRepositoryImpl) Create(ctx context.Context, studio *entity.Studio) error {
	item, err := attributevalue.MarshalMap(studio)
	if err != nil {
		return fmt.Errorf("failed to marshal studio: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
		// スタジオIDの重複を防ぐ条件式
		ConditionExpression: aws.String("attribute_not_exists(studio_id)"),
	})
	if err != nil {
		return fmt.Errorf("failed to put studio item: %w", err)
	}

	return nil
}

// Update はスタジオを更新する
func (r *StudioRepositoryImpl) Update(ctx context.Context, studio *entity.Studio) error {
	item, err := attributevalue.MarshalMap(studio)
	if err != nil {
		return fmt.Errorf("failed to marshal studio: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update studio item: %w", err)
	}

	return nil
}

// Delete はスタジオを削除する（物理削除）
func (r *StudioRepositoryImpl) Delete(ctx context.Context, studioID string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete studio item: %w", err)
	}

	return nil
}
