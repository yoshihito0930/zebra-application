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

// NotificationRepositoryImpl はNotificationRepositoryのDynamoDB実装
type NotificationRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewNotificationRepository はNotificationRepositoryの新しいインスタンスを作成する
func NewNotificationRepository(client *dynamodb.Client) repository.NotificationRepository {
	return &NotificationRepositoryImpl{
		client:    client,
		tableName: "notifications",
	}
}

// Create は通知を作成する
func (r *NotificationRepositoryImpl) Create(ctx context.Context, notification *entity.Notification) error {
	item, err := attributevalue.MarshalMap(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put notification item: %w", err)
	}

	return nil
}

// FindByID は通知IDで通知を取得する
func (r *NotificationRepositoryImpl) FindByID(ctx context.Context, studioID, notificationID string) (*entity.Notification, error) {
	// SK（scheduled_at#notification_id）が必要だが、notification_idのみの場合は検索が必要
	// 簡易実装: Scanで検索（本番ではGSIを使用すべき）
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id"),
		FilterExpression:       aws.String("notification_id = :notification_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id":        &types.AttributeValueMemberS{Value: studioID},
			":notification_id": &types.AttributeValueMemberS{Value: notificationID},
		},
		Limit: aws.Int32(1),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query notification: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("notification not found: %s/%s", studioID, notificationID)
	}

	var notification entity.Notification
	err = attributevalue.UnmarshalMap(result.Items[0], &notification)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal notification: %w", err)
	}

	return &notification, nil
}

// FindPendingByStudio は送信待ちの通知を取得する
func (r *NotificationRepositoryImpl) FindPendingByStudio(ctx context.Context, studioID string, scheduledBefore time.Time) ([]*entity.Notification, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id AND scheduled_at_notification_id <= :scheduled_before"),
		FilterExpression:       aws.String("#status = :status"),
		ExpressionAttributeNames: map[string]string{
			"#status": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id":        &types.AttributeValueMemberS{Value: studioID},
			":scheduled_before": &types.AttributeValueMemberS{Value: scheduledBefore.Format(time.RFC3339)},
			":status":           &types.AttributeValueMemberS{Value: string(entity.NotificationStatusPending)},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query pending notifications: %w", err)
	}

	notifications := make([]*entity.Notification, 0, len(result.Items))
	for _, item := range result.Items {
		var notification entity.Notification
		err := attributevalue.UnmarshalMap(item, &notification)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	return notifications, nil
}

// Update は通知を更新する
func (r *NotificationRepositoryImpl) Update(ctx context.Context, notification *entity.Notification) error {
	item, err := attributevalue.MarshalMap(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update notification item: %w", err)
	}

	return nil
}

// Delete は通知を削除する（物理削除）
func (r *NotificationRepositoryImpl) Delete(ctx context.Context, studioID, notificationID string) error {
	// まず通知を取得してSKを特定
	notification, err := r.FindByID(ctx, studioID, notificationID)
	if err != nil {
		return err
	}

	sk := fmt.Sprintf("%s#%s", notification.ScheduledAt.Format(time.RFC3339), notificationID)

	_, err = r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":                    &types.AttributeValueMemberS{Value: studioID},
			"scheduled_at_notification_id": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete notification item: %w", err)
	}

	return nil
}
