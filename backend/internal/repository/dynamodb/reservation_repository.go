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

// ReservationRepositoryImpl はReservationRepositoryのDynamoDB実装
type ReservationRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewReservationRepository はReservationRepositoryの新しいインスタンスを作成する
func NewReservationRepository(client *dynamodb.Client) repository.ReservationRepository {
	return &ReservationRepositoryImpl{
		client:    client,
		tableName: "reservations",
	}
}

// Create は予約を作成する
func (r *ReservationRepositoryImpl) Create(ctx context.Context, reservation *entity.Reservation) error {
	item, err := attributevalue.MarshalMap(reservation)
	if err != nil {
		return fmt.Errorf("failed to marshal reservation: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to put reservation item: %w", err)
	}

	return nil
}

// FindByID は予約IDで予約を取得する（GSI3を使用）
func (r *ReservationRepositoryImpl) FindByID(ctx context.Context, reservationID string) (*entity.Reservation, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI3"),
		KeyConditionExpression: aws.String("reservation_id = :reservation_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":reservation_id": &types.AttributeValueMemberS{Value: reservationID},
		},
		Limit: aws.Int32(1),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reservation by ID: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("reservation not found: %s", reservationID)
	}

	var reservation entity.Reservation
	err = attributevalue.UnmarshalMap(result.Items[0], &reservation)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
	}

	return &reservation, nil
}

// FindByStudioAndDateRange は指定期間の予約一覧を取得する
func (r *ReservationRepositoryImpl) FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error) {
	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id AND begins_with(#sk, :start_date)"),
		FilterExpression:       aws.String("#sk <= :end_date"),
		ExpressionAttributeNames: map[string]string{
			"#sk": "date_reservation_id", // SK名（実際のスキーマに合わせて調整）
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id":  &types.AttributeValueMemberS{Value: studioID},
			":start_date": &types.AttributeValueMemberS{Value: startDateStr},
			":end_date":   &types.AttributeValueMemberS{Value: endDateStr},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reservations by date range: %w", err)
	}

	reservations := make([]*entity.Reservation, 0, len(result.Items))
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
		}
		reservations = append(reservations, &reservation)
	}

	return reservations, nil
}

// FindByStudioAndStatus はステータス別予約一覧を取得する（GSI1を使用）
func (r *ReservationRepositoryImpl) FindByStudioAndStatus(ctx context.Context, studioID string, status entity.ReservationStatus) ([]*entity.Reservation, error) {
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
		return nil, fmt.Errorf("failed to query reservations by status: %w", err)
	}

	reservations := make([]*entity.Reservation, 0, len(result.Items))
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
		}
		reservations = append(reservations, &reservation)
	}

	return reservations, nil
}

// FindByUserID はユーザー別予約一覧を取得する（GSI2を使用）
func (r *ReservationRepositoryImpl) FindByUserID(ctx context.Context, userID string) ([]*entity.Reservation, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI2"),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reservations by user: %w", err)
	}

	reservations := make([]*entity.Reservation, 0, len(result.Items))
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
		}
		reservations = append(reservations, &reservation)
	}

	return reservations, nil
}

// FindByLinkedReservationID は第2キープを検索する（GSI4を使用）
func (r *ReservationRepositoryImpl) FindByLinkedReservationID(ctx context.Context, linkedReservationID string) ([]*entity.Reservation, error) {
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI4"),
		KeyConditionExpression: aws.String("linked_reservation_id = :linked_reservation_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":linked_reservation_id": &types.AttributeValueMemberS{Value: linkedReservationID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reservations by linked ID: %w", err)
	}

	reservations := make([]*entity.Reservation, 0, len(result.Items))
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
		}
		reservations = append(reservations, &reservation)
	}

	return reservations, nil
}

// FindConflicting は指定時間帯に重複する予約を検索する
func (r *ReservationRepositoryImpl) FindConflicting(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error) {
	dateStr := date.Format("2006-01-02")

	// 同日の予約を全て取得してフィルタリング
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		KeyConditionExpression: aws.String("studio_id = :studio_id AND begins_with(#sk, :date)"),
		ExpressionAttributeNames: map[string]string{
			"#sk": "date_reservation_id",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":studio_id": &types.AttributeValueMemberS{Value: studioID},
			":date":      &types.AttributeValueMemberS{Value: dateStr},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reservations for conflict check: %w", err)
	}

	// 時間帯重複とステータスでフィルタリング
	conflicting := make([]*entity.Reservation, 0)
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			continue
		}

		// confirmed/tentative/scheduledステータスのみチェック
		if reservation.Status != entity.ReservationStatusConfirmed &&
			reservation.Status != entity.ReservationStatusTentative &&
			reservation.Status != entity.ReservationStatusScheduled {
			continue
		}

		// 時間帯の重複チェック
		if isTimeOverlapping(startTime, endTime, reservation.StartTime, reservation.EndTime) {
			conflicting = append(conflicting, &reservation)
		}
	}

	return conflicting, nil
}

// isTimeOverlapping は時間帯が重複しているかチェックする
func isTimeOverlapping(start1, end1, start2, end2 string) bool {
	return start1 < end2 && start2 < end1
}

// FindExpiredTentative は期限切れの仮予約を検索する（GSI1を使用）
func (r *ReservationRepositoryImpl) FindExpiredTentative(ctx context.Context, studioID string, expiryDate time.Time) ([]*entity.Reservation, error) {
	// tentative状態の予約を全て取得
	reservations, err := r.FindByStudioAndStatus(ctx, studioID, entity.ReservationStatusTentative)
	if err != nil {
		return nil, err
	}

	// 期限切れのものをフィルタリング
	expired := make([]*entity.Reservation, 0)
	for _, res := range reservations {
		// expiry_dateフィールドが期限日より前の場合
		// TODO: entity.Reservationにexpiryフィールドが必要
		expired = append(expired, res)
	}

	return expired, nil
}

// FindUpcomingConfirmed は翌日の確定予約を検索する（GSI1を使用）
func (r *ReservationRepositoryImpl) FindUpcomingConfirmed(ctx context.Context, studioID string, date time.Time) ([]*entity.Reservation, error) {
	dateStr := date.Format("2006-01-02")
	gsi1PK := fmt.Sprintf("%s#%s", studioID, entity.ReservationStatusConfirmed)

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("studio_id_status = :pk AND #date = :date"),
		ExpressionAttributeNames: map[string]string{
			"#date": "date",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk":   &types.AttributeValueMemberS{Value: gsi1PK},
			":date": &types.AttributeValueMemberS{Value: dateStr},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query upcoming confirmed reservations: %w", err)
	}

	reservations := make([]*entity.Reservation, 0, len(result.Items))
	for _, item := range result.Items {
		var reservation entity.Reservation
		err := attributevalue.UnmarshalMap(item, &reservation)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal reservation: %w", err)
		}
		reservations = append(reservations, &reservation)
	}

	return reservations, nil
}

// FindPastConfirmed は利用日経過の確定予約を検索する
func (r *ReservationRepositoryImpl) FindPastConfirmed(ctx context.Context, studioID string, beforeDate time.Time) ([]*entity.Reservation, error) {
	// confirmed状態の予約を取得してフィルタリング
	reservations, err := r.FindByStudioAndStatus(ctx, studioID, entity.ReservationStatusConfirmed)
	if err != nil {
		return nil, err
	}

	past := make([]*entity.Reservation, 0)
	for _, res := range reservations {
		if res.Date.Before(beforeDate) {
			past = append(past, res)
		}
	}

	return past, nil
}

// Update は予約を更新する
func (r *ReservationRepositoryImpl) Update(ctx context.Context, reservation *entity.Reservation) error {
	item, err := attributevalue.MarshalMap(reservation)
	if err != nil {
		return fmt.Errorf("failed to marshal reservation: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update reservation item: %w", err)
	}

	return nil
}

// Delete は予約を削除する（物理削除）
func (r *ReservationRepositoryImpl) Delete(ctx context.Context, reservationID string) error {
	// 予約を取得してPK/SKを特定
	reservation, err := r.FindByID(ctx, reservationID)
	if err != nil {
		return err
	}

	_, err = r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"studio_id":            &types.AttributeValueMemberS{Value: reservation.StudioID},
			"date_reservation_id":  &types.AttributeValueMemberS{Value: fmt.Sprintf("%s#%s", reservation.Date.Format("2006-01-02"), reservation.ReservationID)},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete reservation item: %w", err)
	}

	return nil
}
