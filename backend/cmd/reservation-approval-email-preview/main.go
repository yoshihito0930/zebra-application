package main

import (
	"context"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/notification"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	reservationRepo repository.ReservationRepository
	userRepo        repository.UserRepository
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo = dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)
}

// ApprovalEmailPreviewResponse は承認メールのプレビュー（初期値）レスポンス
type ApprovalEmailPreviewResponse struct {
	To               string     `json:"to"`                        // 宛先（予約レコード由来、編集不可）
	Subject          string     `json:"subject"`                   // 件名（テンプレート初期値）
	Body             string     `json:"body"`                      // 本文（テンプレート初期値、編集可能）
	MissingVariables []string   `json:"missing_variables"`         // 値が欠損しているテンプレート変数
	AlreadySentAt    *time.Time `json:"already_sent_at,omitempty"` // 既送信日時（未送信時はnil）
}

// previewApprovalEmailHandler は承認メールの初期値（宛先・件名・本文）を返す。
// 本文初期値の供給元はこのプレビューAPI（BuildApprovalEmailBody）に集約している。
func previewApprovalEmailHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	reservation, err := reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		log.Printf("failed to find reservation (id=%s): %v", reservationID, err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}
	if reservation == nil {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	// 宛先は必ず予約レコードから解決する（手入力経路は作らない）
	recipientEmail, recipientName, resolveErr := notification.ResolveRecipient(ctx, reservation, userRepo)
	if resolveErr != nil {
		log.Printf("failed to resolve recipient for reservation %s: %v", reservationID, resolveErr)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	subject, body, missing := notification.BuildApprovalEmailBody(reservation, recipientName)

	resp := ApprovalEmailPreviewResponse{
		To:               recipientEmail,
		Subject:          subject,
		Body:             body,
		MissingVariables: missing,
		AlreadySentAt:    reservation.ApprovalEmailSentAt,
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(previewApprovalEmailHandler, middleware.RoleAdmin)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
