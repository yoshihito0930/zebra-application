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

// UserRepositoryImpl はUserRepositoryのDynamoDB実装
type UserRepositoryImpl struct {
	client    *dynamodb.Client
	tableName string
}

// NewUserRepository はUserRepositoryの新しいインスタンスを作成する
func NewUserRepository(client *dynamodb.Client) repository.UserRepository {
	return &UserRepositoryImpl{
		client:    client,
		tableName: "users", // TODO: 環境変数から取得するように修正
	}
}

// Create はユーザーを作成する
func (r *UserRepositoryImpl) Create(ctx context.Context, user *entity.User) error {
	// エンティティをDynamoDB属性にマーシャル
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	// DynamoDBにアイテムを登録
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
		// ユーザーIDの重複を防ぐ条件式
		ConditionExpression: aws.String("attribute_not_exists(user_id)"),
	})
	if err != nil {
		return fmt.Errorf("failed to put user item: %w", err)
	}

	return nil
}

// FindByID はユーザーIDでユーザーを取得する
func (r *UserRepositoryImpl) FindByID(ctx context.Context, userID string) (*entity.User, error) {
	// DynamoDBからアイテムを取得
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get user item: %w", err)
	}

	// アイテムが存在しない場合
	if result.Item == nil {
		return nil, fmt.Errorf("user not found: %s", userID)
	}

	// 属性をエンティティにアンマーシャル
	var user entity.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

// FindByEmail はメールアドレスでユーザーを取得する
// GSI1（PK=email）を使用
func (r *UserRepositoryImpl) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	// GSI1でクエリ
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(r.tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("email = :email"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":email": &types.AttributeValueMemberS{Value: email},
		},
		Limit: aws.Int32(1), // 1件のみ取得
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	// アイテムが存在しない場合
	if len(result.Items) == 0 {
		return nil, nil // 重複チェック用にnilを返す
	}

	// 属性をエンティティにアンマーシャル
	var user entity.User
	err = attributevalue.UnmarshalMap(result.Items[0], &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

// Update はユーザー情報を更新する
func (r *UserRepositoryImpl) Update(ctx context.Context, user *entity.User) error {
	// エンティティをDynamoDB属性にマーシャル
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	// DynamoDBのアイテムを更新
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update user item: %w", err)
	}

	return nil
}

// Delete はユーザーを削除する（物理削除）
func (r *UserRepositoryImpl) Delete(ctx context.Context, userID string) error {
	// DynamoDBからアイテムを削除
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete user item: %w", err)
	}

	return nil
}
