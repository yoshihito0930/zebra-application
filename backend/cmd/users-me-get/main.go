package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

var (
	userUsecase *usecase.UserUsecase
	dynamoClient *dynamodb.Client
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient = dynamodb.NewFromConfig(cfg)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	userUsecase = usecase.NewUserUsecase(userRepo, studioRepo)
}

type GetProfileResponse struct {
	UserID      string  `json:"user_id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	PhoneNumber string  `json:"phone_number"`
	CompanyName *string `json:"company_name,omitempty"`
	Address     string  `json:"address"`
	Role        string  `json:"role"`
	StudioID    *string `json:"studio_id,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

func getProfileHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Cognito Authorizerからclaimsを取得
	claims, ok := request.RequestContext.Authorizer["claims"].(map[string]interface{})
	if !ok {
		log.Printf("Failed to get claims from authorizer context")
		return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
	}

	// emailからユーザーを検索
	email, ok := claims["email"].(string)
	if !ok || email == "" {
		log.Printf("Failed to get email from claims")
		return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
	}

	log.Printf("Getting user profile for email: %s", email)

	// メールアドレスからユーザーを検索
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	user, err := userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		log.Printf("Failed to get user by email: %v", err)
		return response.ErrorWithCORS(apierror.ErrUserNotFound), nil
	}

	resp := GetProfileResponse{
		UserID:      user.UserID,
		Name:        user.Name,
		Email:       user.Email,
		PhoneNumber: user.PhoneNumber,
		CompanyName: user.CompanyName,
		Address:     user.Address,
		Role:        string(user.Role),
		StudioID:    user.StudioID,
		CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// API GatewayのCognito Authorizerが認証を行うため、ミドルウェアは不要
	// 直接getProfileHandlerを呼び出す
	return getProfileHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
