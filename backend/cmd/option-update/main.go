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

type UpdateOptionRequest struct {
	OptionName   *string  `json:"option_name,omitempty"`
	Price        *int     `json:"price,omitempty"`
	TaxRate      *float64 `json:"tax_rate,omitempty"`
	IsActive     *bool    `json:"is_active,omitempty"`
	DisplayOrder *int     `json:"display_order,omitempty"`
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

func updateOptionHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// スタジオIDとオプションIDを取得
	studioID, ok := request.RequestContext.Authorizer["studio_id"].(string)
	if !ok || studioID == "" {
		return response.ErrorWithCORS(apierror.ErrForbidden), nil
	}

	optionID := request.PathParameters["id"]
	if optionID == "" {
		return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
	}

	var req UpdateOptionRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	if req.OptionName != nil {
		validator.ValidateStringLength(*req.OptionName, "option_name", 1, 100, validationResult)
	}

	if req.Price != nil && *req.Price <= 0 {
		validationResult.Valid = false
		validationResult.Errors = append(validationResult.Errors, validator.ValidationError{
			Field:   "price",
			Message: "料金は0より大きい値を指定してください",
		})
	}

	if req.TaxRate != nil && (*req.TaxRate < 0 || *req.TaxRate > 1) {
		validationResult.Valid = false
		validationResult.Errors = append(validationResult.Errors, validator.ValidationError{
			Field:   "tax_rate",
			Message: "税率は0から1の範囲で指定してください",
		})
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// オプション更新
	input := usecase.UpdateOptionInput{
		StudioID:     studioID,
		OptionID:     optionID,
		OptionName:   req.OptionName,
		Price:        req.Price,
		TaxRate:      req.TaxRate,
		IsActive:     req.IsActive,
		DisplayOrder: req.DisplayOrder,
	}

	option, err := optionUsecase.UpdateOption(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrOptionNotFound:
			return response.ErrorWithCORS(apierror.ErrOptionNotFound), nil
		default:
			log.Printf("Failed to update option: %v", err)
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
	authHandler := middleware.MockAuthMiddleware(updateOptionHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
