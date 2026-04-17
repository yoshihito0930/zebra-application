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

type OptionResponse struct {
	OptionID     string  `json:"option_id"`
	StudioID     string  `json:"studio_id"`
	OptionName   string  `json:"option_name"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	IsActive     bool    `json:"is_active"`
	DisplayOrder *int    `json:"display_order,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

func getOptionHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータから取得
	studioID := request.PathParameters["studio_id"]
	optionID := request.PathParameters["id"]

	if studioID == "" || optionID == "" {
		return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
	}

	// オプション取得
	option, err := optionUsecase.GetOption(ctx, studioID, optionID)
	if err != nil {
		switch err {
		case apierror.ErrOptionNotFound:
			return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
		default:
			log.Printf("Failed to get option: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := OptionResponse{
		OptionID:     option.OptionID,
		StudioID:     option.StudioID,
		OptionName:   option.OptionName,
		Price:        option.Price,
		TaxRate:      option.TaxRate,
		IsActive:     option.IsActive,
		DisplayOrder: option.DisplayOrder,
		CreatedAt:    option.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    option.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(getOptionHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
