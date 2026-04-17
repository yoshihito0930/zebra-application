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
	planUsecase *usecase.PlanUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	planRepo := dynamodbRepo.NewPlanRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	planUsecase = usecase.NewPlanUsecase(planRepo, studioRepo)
}

type PlanResponse struct {
	PlanID       string  `json:"plan_id"`
	StudioID     string  `json:"studio_id"`
	PlanName     string  `json:"plan_name"`
	Description  *string `json:"description,omitempty"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	IsActive     bool    `json:"is_active"`
	DisplayOrder *int    `json:"display_order,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

func getPlanHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータから取得
	studioID := request.PathParameters["studio_id"]
	planID := request.PathParameters["id"]

	if studioID == "" || planID == "" {
		return response.ErrorWithCORS(apierror.ErrPlanNotFound), nil
	}

	// プラン取得
	plan, err := planUsecase.GetPlan(ctx, studioID, planID)
	if err != nil {
		switch err {
		case apierror.ErrPlanNotFound:
			return response.ErrorWithCORS(apierror.ErrPlanNotFound), nil
		default:
			log.Printf("Failed to get plan: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := PlanResponse{
		PlanID:       plan.PlanID,
		StudioID:     plan.StudioID,
		PlanName:     plan.PlanName,
		Description:  plan.Description,
		Price:        plan.Price,
		TaxRate:      plan.TaxRate,
		IsActive:     plan.IsActive,
		DisplayOrder: plan.DisplayOrder,
		CreatedAt:    plan.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    plan.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(getPlanHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
