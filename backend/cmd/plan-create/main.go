package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
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

type CreatePlanRequest struct {
	PlanName     string  `json:"plan_name"`
	Description  *string `json:"description,omitempty"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	DisplayOrder *int    `json:"display_order,omitempty"`
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

func createPlanHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// スタジオIDを取得（認証ミドルウェアから渡される）
	studioID, ok := request.RequestContext.Authorizer["studio_id"].(string)
	if !ok || studioID == "" {
		return response.ErrorWithCORS(apierror.ErrForbidden), nil
	}

	var req CreatePlanRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	validator.ValidateRequired(req.PlanName, "plan_name", validationResult)
	validator.ValidateStringLength(req.PlanName, "plan_name", 1, 100, validationResult)

	if req.Description != nil {
		validator.ValidateStringLength(*req.Description, "description", 0, 500, validationResult)
	}

	if req.Price <= 0 {
		validationResult.Valid = false
		validationResult.Errors = append(validationResult.Errors, validator.ValidationError{
			Field:   "price",
			Message: "料金は0より大きい値を指定してください",
		})
	}

	if req.TaxRate < 0 || req.TaxRate > 1 {
		validationResult.Valid = false
		validationResult.Errors = append(validationResult.Errors, validator.ValidationError{
			Field:   "tax_rate",
			Message: "税率は0から1の範囲で指定してください",
		})
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// プラン作成
	input := usecase.CreatePlanInput{
		StudioID:     studioID,
		PlanName:     req.PlanName,
		Description:  req.Description,
		Price:        req.Price,
		TaxRate:      req.TaxRate,
		DisplayOrder: req.DisplayOrder,
	}

	plan, err := planUsecase.CreatePlan(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		default:
			log.Printf("Failed to create plan: %v", err)
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

	return response.Created(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(createPlanHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
