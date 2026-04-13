package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	planUsecase *usecase.PlanUsecase
)

// init は Lambda 関数の初期化時に1度だけ実行される
func init() {
	// AWS SDK の設定をロード
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	// DynamoDB クライアントを作成
	dynamoClient := dynamodb.NewFromConfig(cfg)

	// リポジトリを初期化
	planRepo := repository.NewPlanRepository(dynamoClient)

	// ユースケースを初期化
	planUsecase = usecase.NewPlanUsecase(planRepo)
}

// PlanResponse はプランレスポンスの構造体
type PlanResponse struct {
	PlanID       string  `json:"plan_id"`
	PlanName     string  `json:"plan_name"`
	Description  string  `json:"description"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	DisplayOrder int     `json:"display_order"`
}

// PlansListResponse はプラン一覧レスポンスの構造体
type PlansListResponse struct {
	Plans []PlanResponse `json:"plans"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータからスタジオIDを取得
	studioID := request.PathParameters["id"]
	if studioID == "" {
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	// 有効なプラン一覧を取得
	plans, err := planUsecase.ListActivePlans(ctx, studioID)
	if err != nil {
		log.Printf("Failed to list plans: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// レスポンスを作成
	planResponses := make([]PlanResponse, len(plans))
	for i, p := range plans {
		planResponses[i] = PlanResponse{
			PlanID:       p.PlanID,
			PlanName:     p.PlanName,
			Description:  p.Description,
			Price:        p.Price,
			TaxRate:      p.TaxRate,
			DisplayOrder: p.DisplayOrder,
		}
	}

	resp := PlansListResponse{
		Plans: planResponses,
	}

	return response.OKWithCORS(resp), nil
}

func main() {
	lambda.Start(handler)
}
