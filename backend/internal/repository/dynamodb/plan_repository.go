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

// PlanRepositoryImpl はPlanRepositoryのDynamoDB実装
type PlanRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewPlanRepository はPlanRepositoryの新しいインスタンスを作成する
func NewPlanRepository(client *dynamodb.Client) repository.PlanRepository {
	return &PlanRepositoryImpl{
		client:    client,
		tableName: GetTableName("plans"),
	}
}

// Create はプランを作成する
func (r *PlanRepositoryImpl) Create(ctx context.Context, plan *entity.Plan) error {
	item, err := attributevalue.MarshalMap(plan)
	if err != nil {
		return fmt.Errorf("failed to marshal plan: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put plan item: %w", err)
	}

	return nil
}

// FindByID はプランIDでプランを取得する
func (r *PlanRepositoryImpl) FindByID(ctx context.Context, studioID, planID string) (*entity.Plan, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
			"plan_id":   &types.AttributeValueMemberS{Value: planID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get plan item: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("plan not found: %s/%s", studioID, planID)
	}

	var plan entity.Plan
	err = attributevalue.UnmarshalMap(result.Item, &plan)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal plan: %w", err)
	}

	return &plan, nil
}

// FindByStudio はスタジオ別プラン一覧を取得する
func (r *PlanRepositoryImpl) FindByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id": &types.AttributeValueMemberS{Value: studioID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query plans by studio: %w", err)
	}

	plans := make([]*entity.Plan, 0, len(result.Items))
	for _, item := range result.Items {
		var plan entity.Plan
		err := attributevalue.UnmarshalMap(item, &plan)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal plan: %w", err)
		}
		plans = append(plans, &plan)
	}

	return plans, nil
}

// FindActiveByStudio は有効なプラン一覧を取得する
func (r *PlanRepositoryImpl) FindActiveByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error) {
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
		return nil, fmt.Errorf("failed to query active plans: %w", err)
	}

	plans := make([]*entity.Plan, 0, len(result.Items))
	for _, item := range result.Items {
		var plan entity.Plan
		err := attributevalue.UnmarshalMap(item, &plan)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal plan: %w", err)
		}
		plans = append(plans, &plan)
	}

	return plans, nil
}

// Update はプランを更新する
func (r *PlanRepositoryImpl) Update(ctx context.Context, plan *entity.Plan) error {
	item, err := attributevalue.MarshalMap(plan)
	if err != nil {
		return fmt.Errorf("failed to marshal plan: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update plan item: %w", err)
	}

	return nil
}

// Delete はプランを削除する（物理削除）
func (r *PlanRepositoryImpl) Delete(ctx context.Context, studioID, planID string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id": &types.AttributeValueMemberS{Value: studioID},
			"plan_id":   &types.AttributeValueMemberS{Value: planID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete plan item: %w", err)
	}

	return nil
}
