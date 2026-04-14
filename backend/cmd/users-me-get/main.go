package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

var (
	userUsecase *usecase.UserUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
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
	// 認証トークンからユーザーIDを取得
	userID, ok := request.RequestContext.Authorizer["user_id"].(string)
	if !ok || userID == "" {
		log.Printf("Failed to get user_id from authorizer context")
		return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
	}

	// プロフィールを取得
	user, err := userUsecase.GetProfile(ctx, userID)
	if err != nil {
		switch err {
		case apierror.ErrUserNotFound:
			return response.ErrorWithCORS(apierror.ErrUserNotFound), nil
		default:
			log.Printf("Failed to get profile: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
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
	authHandler := middleware.MockAuthMiddleware(getProfileHandler)
	// すべてのロールがアクセス可能
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer, middleware.RoleAdmin, middleware.RoleStaff)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
