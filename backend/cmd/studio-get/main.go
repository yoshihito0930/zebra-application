package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

var (
	studioRepo *dynamodbRepo.StudioRepositoryImpl
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	studioRepo = dynamodbRepo.NewStudioRepository(dynamoClient).(*dynamodbRepo.StudioRepositoryImpl)
}

type StudioResponse struct {
	StudioID            string   `json:"studio_id"`
	StudioName          string   `json:"studio_name"`
	StudioAddress       string   `json:"studio_address"`
	PhoneNumber         string   `json:"phone_number"`
	Email               string   `json:"email"`
	BusinessHoursStart  string   `json:"business_hours_start"`
	BusinessHoursEnd    string   `json:"business_hours_end"`
	RegularHolidays     []string `json:"regular_holidays,omitempty"`
	TentativeExpiryDays int      `json:"tentative_expiry_days"`
	CancellationPolicy  *string  `json:"cancellation_policy,omitempty"`
	IsActive            bool     `json:"is_active"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
}

func getStudioHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータからスタジオIDを取得
	studioID := request.PathParameters["id"]

	if studioID == "" {
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	// スタジオ取得
	studio, err := studioRepo.FindByID(ctx, studioID)
	if err != nil {
		log.Printf("Failed to get studio: %v", err)
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	resp := StudioResponse{
		StudioID:            studio.StudioID,
		StudioName:          studio.StudioName,
		StudioAddress:       studio.StudioAddress,
		PhoneNumber:         studio.PhoneNumber,
		Email:               studio.Email,
		BusinessHoursStart:  studio.BusinessHoursStart,
		BusinessHoursEnd:    studio.BusinessHoursEnd,
		RegularHolidays:     studio.RegularHolidays,
		TentativeExpiryDays: studio.TentativeExpiryDays,
		CancellationPolicy:  studio.CancellationPolicy,
		IsActive:            studio.IsActive,
		CreatedAt:           studio.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           studio.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証不要（公開情報）
	return getStudioHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
