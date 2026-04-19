package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
	"github.com/yoshihito0930/zebra-application/internal/helper"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// グローバル変数（コールドスタート対策）
var (
	reservationUsecase *usecase.ReservationUsecase
	planRepo           repository.PlanRepository
	optionRepo         repository.OptionRepository
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
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo = dynamodbRepo.NewPlanRepository(dynamoClient)
	optionRepo = dynamodbRepo.NewOptionRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	// ユースケースを初期化
	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepo,
		optionRepo,
		blockedSlotRepo,
		studioRepo,
	)
}

// CreateReservationRequest は予約作成リクエストの構造体
type CreateReservationRequest struct {
	StudioID          string   `json:"studio_id"`
	ReservationType   string   `json:"reservation_type"`
	PlanID            string   `json:"plan_id"`
	Date              string   `json:"date"`
	StartTime         string   `json:"start_time"`
	EndTime           string   `json:"end_time"`
	Options           []string `json:"options"`
	ShootingType      []string `json:"shooting_type"`
	ShootingDetails   string   `json:"shooting_details"`
	PhotographerName  string   `json:"photographer_name"`
	NumberOfPeople    int      `json:"number_of_people"`
	NeedsProtection   bool     `json:"needs_protection"`
	EquipmentInsurance bool    `json:"equipment_insurance"`
	Note              string   `json:"note"`
}


func createReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// リクエストボディをパース
	var req CreateReservationRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	// 必須フィールドのチェック
	validator.ValidateRequired(req.StudioID, "studio_id", validationResult)
	validator.ValidateRequired(req.ReservationType, "reservation_type", validationResult)
	validator.ValidateRequired(req.PlanID, "plan_id", validationResult)
	validator.ValidateRequired(req.Date, "date", validationResult)
	validator.ValidateRequired(req.StartTime, "start_time", validationResult)
	validator.ValidateRequired(req.EndTime, "end_time", validationResult)
	validator.ValidateRequired(req.ShootingDetails, "shooting_details", validationResult)
	validator.ValidateRequired(req.PhotographerName, "photographer_name", validationResult)

	// 予約種別のチェック
	validator.ValidateEnum(req.ReservationType, "reservation_type", []string{"regular", "tentative", "location_scout", "second_keep"}, validationResult)

	// 日付形式のチェック
	if validator.ValidateDateFormat(req.Date, "date", validationResult) {
		validator.ValidateDateNotPast(req.Date, "date", validationResult)
	}

	// 時刻形式のチェック
	validator.ValidateTimeFormat(req.StartTime, "start_time", validationResult)
	validator.ValidateTimeFormat(req.EndTime, "end_time", validationResult)
	validator.ValidateTimeRange(req.StartTime, req.EndTime, validationResult)

	// 文字列長のチェック
	if req.ShootingDetails != "" {
		validator.ValidateStringLength(req.ShootingDetails, "shooting_details", 1, 500, validationResult)
	}
	if req.PhotographerName != "" {
		validator.ValidateStringLength(req.PhotographerName, "photographer_name", 1, 50, validationResult)
	}
	if req.Note != "" {
		validator.ValidateStringLength(req.Note, "note", 0, 500, validationResult)
	}

	// 人数のチェック
	if req.NumberOfPeople < 1 {
		validationResult.AddError("number_of_people", "人数は1以上で指定してください")
	}

	// 撮影タイプのチェック
	if len(req.ShootingType) == 0 {
		validationResult.AddError("shooting_type", "撮影タイプを1つ以上選択してください")
	}

	// バリデーションエラーがあればエラーレスポンスを返す
	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// コンテキストからユーザーIDを取得
	userID := middleware.GetUserIDFromContext(ctx)

	// 日付をパース
	date, _ := time.Parse("2006-01-02", req.Date)

	// Noteをポインタに変換
	var note *string
	if req.Note != "" {
		note = &req.Note
	}

	// ユースケースの入力データを作成
	input := usecase.CreateReservationInput{
		StudioID:           req.StudioID,
		UserID:             &userID,
		ReservationType:    entity.ReservationType(req.ReservationType),
		PlanID:             req.PlanID,
		Date:               date,
		StartTime:          req.StartTime,
		EndTime:            req.EndTime,
		Options:            req.Options,
		ShootingType:       req.ShootingType,
		ShootingDetails:    req.ShootingDetails,
		PhotographerName:   req.PhotographerName,
		NumberOfPeople:     req.NumberOfPeople,
		NeedsProtection:    req.NeedsProtection,
		EquipmentInsurance: req.EquipmentInsurance,
		Note:               note,
	}

	// 予約を作成
	reservation, err := reservationUsecase.CreateReservation(ctx, input)
	if err != nil {
		// 業務エラーのハンドリング
		switch err {
		case apierror.ErrReservationConflict:
			return response.ErrorWithCORS(apierror.ErrReservationConflict), nil
		case apierror.ErrBlockedSlotConflict:
			return response.ErrorWithCORS(apierror.ErrBlockedSlotConflict), nil
		case apierror.ErrSecondKeepNoPrimary:
			return response.ErrorWithCORS(apierror.ErrSecondKeepNoPrimary), nil
		case apierror.ErrPlanNotFound:
			return response.ErrorWithCORS(apierror.ErrPlanNotFound), nil
		case apierror.ErrPlanInactive:
			return response.ErrorWithCORS(apierror.ErrPlanInactive), nil
		default:
			log.Printf("Failed to create reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// helperを使ってレスポンスを構築（Plan/Optionの詳細を取得）
	resp := helper.BuildReservationResponse(ctx, reservation, planRepo, optionRepo)

	return response.CreatedWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(createReservationHandler)

	// 認可ミドルウェアを適用（customer または admin のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer, middleware.RoleAdmin)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
