package middleware

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
)

// Handler はLambdaハンドラーの型
type Handler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

// ContextKey はコンテキストのキーの型
type ContextKey string

// コンテキストキーの定義
const (
	UserIDKey   ContextKey = "user_id"
	EmailKey    ContextKey = "email"
	RoleKey     ContextKey = "role"
	StudioIDKey ContextKey = "studio_id"
)
