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

type CreateOptionRequest struct {
	OptionName   string  `json:"option_name"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	DisplayOrder *int    `json:"display_order,omitempty"`
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

func createOptionHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// スタジオIDを取得（認証ミドルウェアから渡される）
	studioID, ok := request.RequestContext.Authorizer["studio_id"].(string)
	if !ok || studioID == "" {
		return response.ErrorWithCORS(apierror.ErrForbidden), nil
	}

	var req CreateOptionRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	validator.ValidateRequired(req.OptionName, "option_name", validationResult)
	validator.ValidateStringLength(req.OptionName, "option_name", 1, 100, validationResult)

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

	// オプション作成
	input := usecase.CreateOptionInput{
		StudioID:     studioID,
		OptionName:   req.OptionName,
		Price:        req.Price,
		TaxRate:      req.TaxRate,
		DisplayOrder: req.DisplayOrder,
	}

	option, err := optionUsecase.CreateOption(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		default:
			log.Printf("Failed to create option: %v", err)
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

	return response.Created(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(createOptionHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
