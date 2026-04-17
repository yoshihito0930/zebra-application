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

// グローバル変数（コールドスタート対策）
var (
	optionUsecase *usecase.OptionUsecase
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
	optionRepo := dynamodbRepo.NewOptionRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	// ユースケースを初期化
	optionUsecase = usecase.NewOptionUsecase(optionRepo, studioRepo)
}

// OptionResponse はオプションレスポンスの構造体
type OptionResponse struct {
	OptionID     string  `json:"option_id"`
	OptionName   string  `json:"option_name"`
	Price        int     `json:"price"`
	TaxRate      float64 `json:"tax_rate"`
	DisplayOrder *int    `json:"display_order,omitempty"`
}

// OptionsListResponse はオプション一覧レスポンスの構造体
type OptionsListResponse struct {
	Options []OptionResponse `json:"options"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータからスタジオIDを取得
	studioID := request.PathParameters["id"]
	if studioID == "" {
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	// 有効なオプション一覧を取得
	options, err := optionUsecase.ListActiveOptions(ctx, studioID)
	if err != nil {
		log.Printf("Failed to list options: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// レスポンスを作成
	optionResponses := make([]OptionResponse, len(options))
	for i, o := range options {
		optionResponses[i] = OptionResponse{
			OptionID:     o.OptionID,
			OptionName:   o.OptionName,
			Price:        o.Price,
			TaxRate:      o.TaxRate,
			DisplayOrder: o.DisplayOrder,
		}
	}

	resp := OptionsListResponse{
		Options: optionResponses,
	}

	return response.OKWithCORS(resp), nil
}

func main() {
	lambda.Start(handler)
}
