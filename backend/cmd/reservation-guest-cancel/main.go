package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/yoshihito0930/zebra-application/internal/helper"
	"github.com/yoshihito0930/zebra-application/internal/notification"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// グローバル変数（コールドスタート対策）
var (
	reservationUsecase *usecase.ReservationUsecase
	emailService       *notification.EmailService
	planRepo           repository.PlanRepository
	optionRepo         repository.OptionRepository
	userRepo           repository.UserRepository
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

	// SES クライアントを作成
	sesClient := sesv2.NewFromConfig(cfg)
	emailService = notification.NewEmailService(sesClient)

	// リポジトリを初期化
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)
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

func cancelGuestReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータからトークンを取得
	guestToken, ok := request.PathParameters["token"]
	if !ok || guestToken == "" {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// トークン形式を検証
	if err := helper.ValidateGuestToken(guestToken); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// トークンで予約をキャンセル
	reservation, err := reservationUsecase.CancelByGuestToken(ctx, guestToken)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to cancel guest reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// キャンセル完了メールを送信
	if err := emailService.SendGuestReservationCancellation(ctx, reservation); err != nil {
		// メール送信エラーはログに記録するが、処理は継続
		log.Printf("Failed to send cancellation email: %v", err)
	}

	// 管理者宛にキャンセル通知メールを送信（失敗時もログのみ）
	admins, adminErr := userRepo.FindAdminsByStudioID(ctx, reservation.StudioID)
	if adminErr != nil {
		log.Printf("failed to find admins for studio %s: %v", reservation.StudioID, adminErr)
	}
	adminEmails := make([]string, 0, len(admins))
	for _, a := range admins {
		if a.Email != "" {
			adminEmails = append(adminEmails, a.Email)
		}
	}
	if len(adminEmails) > 0 {
		if err := emailService.SendAdminReservationCancellationNotification(ctx, reservation, nil, adminEmails); err != nil {
			log.Printf("failed to send admin reservation cancellation notification: %v", err)
		}
	} else {
		log.Printf("no admin found for studio %s, skipping admin cancellation notification", reservation.StudioID)
	}

	// helperを使ってレスポンスを構築
	resp := helper.BuildReservationResponse(ctx, reservation, planRepo, optionRepo, userRepo)

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// ゲスト予約キャンセルは認証不要（トークンベース認証）
	return cancelGuestReservationHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
