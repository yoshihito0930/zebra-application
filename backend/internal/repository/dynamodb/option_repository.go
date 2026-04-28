package dynamodb

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// optionRepository はOptionRepositoryのDynamoDB実装
type optionRepository struct {
	client    *dynamodb.Client
	tableName string
}

// NewOptionRepository はOptionRepositoryの新しいインスタンスを作成する
func NewOptionRepository(client *dynamodb.Client) repository.OptionRepository {
	return &optionRepository{
		client:    client,
		tableName: GetTableName("options"),
	}
}

// Create はオプションを作成する
func (r *optionRepository) Create(ctx context.Context, option *entity.Option) error {
	// 現在時刻を設定
	now := time.Now()
	option.CreatedAt = now
	option.UpdatedAt = now

	// エンティティをDynamoDBアイテムに変換
	item, err := attributevalue.MarshalMap(option)
	if err != nil {
		return fmt.Errorf("failed to marshal option: %w", err)
	}

	// PutItemを実行
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put option: %w", err)
	}

	return nil
}

// FindByID はオプションIDでオプションを取得する
func (r *optionRepository) FindByID(ctx context.Context, studioID string, optionID string) (*entity.Option, error) {
	// GetItemを実行
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
			"option_id": &types.AttributeValueMemberS{Value: optionID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get option: %w", err)
	}

	// アイテムが見つからなかった場合
	if result.Item == nil {
		return nil, fmt.Errorf("option not found: %s", optionID)
	}

	// DynamoDBアイテムをエンティティに変換
	var option entity.Option
	err = attributevalue.UnmarshalMap(result.Item, &option)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal option: %w", err)
	}

	return &option, nil
}

// FindByStudioID はスタジオIDでオプション一覧を取得する
func (r *optionRepository) FindByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error) {
	// Queryを実行
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id": &types.AttributeValueMemberS{Value: studioID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query options: %w", err)
	}

	// DynamoDBアイテムをエンティティに変換
	options := make([]*entity.Option, 0, len(result.Items))
	for _, item := range result.Items {
		var option entity.Option
		err = attributevalue.UnmarshalMap(item, &option)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal option: %w", err)
		}
		options = append(options, &option)
	}

	return options, nil
}

// FindActiveByStudioID は有効なオプション一覧を取得する
func (r *optionRepository) FindActiveByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error) {
	// Queryを実行（is_active=trueでフィルタ）
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id"),
		FilterExpression:       aws.String("is_active = :is_active"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id": &types.AttributeValueMemberS{Value: studioID},
			":is_active": &types.AttributeValueMemberBOOL{Value: true},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query active options: %w", err)
	}

	// DynamoDBアイテムをエンティティに変換
	options := make([]*entity.Option, 0, len(result.Items))
	for _, item := range result.Items {
		var option entity.Option
		err = attributevalue.UnmarshalMap(item, &option)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal option: %w", err)
		}
		options = append(options, &option)
	}

	return options, nil
}

// Update はオプションを更新する
func (r *optionRepository) Update(ctx context.Context, option *entity.Option) error {
	// 更新日時を設定
	option.UpdatedAt = time.Now()

	// エンティティをDynamoDBアイテムに変換
	item, err := attributevalue.MarshalMap(option)
	if err != nil {
		return fmt.Errorf("failed to marshal option: %w", err)
	}

	// PutItemを実行（上書き）
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update option: %w", err)
	}

	return nil
}

// Delete はオプションを削除する
func (r *optionRepository) Delete(ctx context.Context, studioID string, optionID string) error {
	// DeleteItemを実行
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
			"option_id": &types.AttributeValueMemberS{Value: optionID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete option: %w", err)
	}

	return nil
}
