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
	optionUsecase *usecase.OptionUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	optionRepo := dynamodbRepo.NewOptionRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	optionUsecase = usecase.NewOptionUsecase(optionRepo, studioRepo)
}

type DeleteOptionResponse struct {
	Message string `json:"message"`
}

func deleteOptionHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// スタジオIDとオプションIDを取得
	studioID, ok := request.RequestContext.Authorizer["studio_id"].(string)
	if !ok || studioID == "" {
		return response.ErrorWithCORS(apierror.ErrForbiddenRole), nil
	}

	optionID := request.PathParameters["id"]
	if optionID == "" {
		return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
	}

	// オプション削除（論理削除）
	err := optionUsecase.DeleteOption(ctx, studioID, optionID)
	if err != nil {
		switch err {
		case apierror.ErrOptionNotFound:
			return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
		default:
			log.Printf("Failed to delete option: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := DeleteOptionResponse{
		Message: "オプションを削除しました",
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(deleteOptionHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
