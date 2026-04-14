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

// BlockedSlotRepositoryImpl はBlockedSlotRepositoryのDynamoDB実装
type BlockedSlotRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewBlockedSlotRepository はBlockedSlotRepositoryの新しいインスタンスを作成する
func NewBlockedSlotRepository(client *dynamodb.Client) repository.BlockedSlotRepository {
	return &BlockedSlotRepositoryImpl{
		client:    client,
		tableName: "blocked_slots",
	}
}

// Create はブロック枠を作成する
func (r *BlockedSlotRepositoryImpl) Create(ctx context.Context, blockedSlot *entity.BlockedSlot) error {
	item, err := attributevalue.MarshalMap(blockedSlot)
	if err != nil {
		return fmt.Errorf("failed to marshal blocked slot: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put blocked slot item: %w", err)
	}

	return nil
}

// FindByID はブロック枠IDでブロック枠を取得する
func (r *BlockedSlotRepositoryImpl) FindByID(ctx context.Context, studioID, blockedSlotID string) (*entity.BlockedSlot, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":        &types.AttributeValueMemberS{Value: studioID},
			"date_blocked_slot_id": &types.AttributeValueMemberS{Value: blockedSlotID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get blocked slot item: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("blocked slot not found: %s/%s", studioID, blockedSlotID)
	}

	var blockedSlot entity.BlockedSlot
	err = attributevalue.UnmarshalMap(result.Item, &blockedSlot)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal blocked slot: %w", err)
	}

	return &blockedSlot, nil
}

// FindByStudioAndDate は指定日のブロック枠を取得する
func (r *BlockedSlotRepositoryImpl) FindByStudioAndDate(ctx context.Context, studioID string, date time.Time) ([]*entity.BlockedSlot, error) {
	dateStr := date.Format("2006-01-02")

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id AND begins_with(#sk, :date)"),
		ExpressionAttributeNames: map[string]string{
			"#sk": "date_blocked_slot_id",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id": &types.AttributeValueMemberS{Value: studioID},
			":date":      &types.AttributeValueMemberS{Value: dateStr},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query blocked slots by date: %w", err)
	}

	blockedSlots := make([]*entity.BlockedSlot, 0, len(result.Items))
	for _, item := range result.Items {
		var blockedSlot entity.BlockedSlot
		err := attributevalue.UnmarshalMap(item, &blockedSlot)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal blocked slot: %w", err)
		}
		blockedSlots = append(blockedSlots, &blockedSlot)
	}

	return blockedSlots, nil
}

// FindByStudioAndDateRange は指定期間のブロック枠を取得する
func (r *BlockedSlotRepositoryImpl) FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.BlockedSlot, error) {
	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id"),
		FilterExpression:       aws.String("#date BETWEEN :start_date AND :end_date"),
		ExpressionAttributeNames: map[string]string{
			"#date": "date",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id":  &types.AttributeValueMemberS{Value: studioID},
			":start_date": &types.AttributeValueMemberS{Value: startDateStr},
			":end_date":   &types.AttributeValueMemberS{Value: endDateStr},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query blocked slots by date range: %w", err)
	}

	blockedSlots := make([]*entity.BlockedSlot, 0, len(result.Items))
	for _, item := range result.Items {
		var blockedSlot entity.BlockedSlot
		err := attributevalue.UnmarshalMap(item, &blockedSlot)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal blocked slot: %w", err)
		}
		blockedSlots = append(blockedSlots, &blockedSlot)
	}

	return blockedSlots, nil
}

// Update はブロック枠を更新する
func (r *BlockedSlotRepositoryImpl) Update(ctx context.Context, blockedSlot *entity.BlockedSlot) error {
	item, err := attributevalue.MarshalMap(blockedSlot)
	if err != nil {
		return fmt.Errorf("failed to marshal blocked slot: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update blocked slot item: %w", err)
	}

	return nil
}

// Delete はブロック枠を削除する（物理削除）
func (r *BlockedSlotRepositoryImpl) Delete(ctx context.Context, studioID, blockedSlotID string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":        &types.AttributeValueMemberS{Value: studioID},
			"date_blocked_slot_id": &types.AttributeValueMemberS{Value: blockedSlotID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete blocked slot item: %w", err)
	}

	return nil
}
