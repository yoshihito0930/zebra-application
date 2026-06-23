package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
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
	emailService    *notification.EmailService
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	sesClient := sesv2.NewFromConfig(cfg)
	emailService = notification.NewEmailService(sesClient)

	reservationRepo = dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)
}

// SendApprovalEmailRequest は承認メール送信リクエスト
// 宛先はボディに含めない（必ず予約レコードから再解決する＝手入力ミスの排除）
type SendApprovalEmailRequest struct {
	Subject string `json:"subject"` // 件名（省略時はテンプレート件名を使用）
	Body    string `json:"body"`    // 本文（管理者が編集した最終内容）
}

// SendApprovalEmailResponse は承認メール送信レスポンス
type SendApprovalEmailResponse struct {
	ReservationID       string    `json:"reservation_id"`
	To                  string    `json:"to"`
	ApprovalEmailSentAt time.Time `json:"approval_email_sent_at"`
}

func sendApprovalEmailHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	var req SendApprovalEmailRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
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

	// 欠損ガード: テンプレート展開時に欠損変数があれば、未展開・空欄のまま送信させない。
	// サーバ側で再計算して判定する（UIの状態に依存しない）。
	subject, templateBody, missing := notification.BuildApprovalEmailBody(reservation, recipientName)
	if len(missing) > 0 {
		log.Printf("approval email blocked due to missing variables (reservation_id=%s): %v", reservationID, missing)
		return response.ErrorWithCORS(apierror.ErrApprovalEmailMissingVariables.WithDetails(toValidationDetails(missing))), nil
	}

	// 件名・本文は管理者の編集後の内容を優先しつつ、未指定ならテンプレート値を使う。
	finalSubject := strings.TrimSpace(req.Subject)
	if finalSubject == "" {
		finalSubject = subject
	}
	finalBody := req.Body
	if strings.TrimSpace(finalBody) == "" {
		finalBody = templateBody
	}

	// 編集後の本文に未展開プレースホルダが残っていないかの軽いチェック。
	// fmt.Sprintf の欠損マーカーや空欄が残ったまま送られるのを防ぐ。
	if containsUnresolvedPlaceholder(finalBody) {
		log.Printf("approval email blocked due to unresolved placeholder in body (reservation_id=%s)", reservationID)
		return response.ErrorWithCORS(apierror.ErrApprovalEmailMissingVariables), nil
	}

	if err := emailService.SendApprovalEmailWithBody(ctx, recipientEmail, finalSubject, finalBody); err != nil {
		log.Printf("failed to send approval email (reservation_id=%s): %v", reservationID, err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// 送信済み状態と送信日時を記録する。
	sentAt := time.Now().UTC()
	reservation.ApprovalEmailSentAt = &sentAt
	reservation.UpdatedAt = sentAt
	if err := reservationRepo.Update(ctx, reservation); err != nil {
		// メールは送信済みだが記録に失敗。再送による二重送信を避けるため、内部エラーとして扱う。
		log.Printf("approval email sent but failed to record sent state (reservation_id=%s): %v", reservationID, err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	resp := SendApprovalEmailResponse{
		ReservationID:       reservation.ReservationID,
		To:                  recipientEmail,
		ApprovalEmailSentAt: sentAt,
	}
	return response.OKWithCORS(resp), nil
}

// toValidationDetails は欠損変数名の一覧をバリデーション詳細に変換する
func toValidationDetails(missing []string) []apierror.ValidationErrorDetail {
	details := make([]apierror.ValidationErrorDetail, 0, len(missing))
	for _, m := range missing {
		details = append(details, apierror.ValidationErrorDetail{
			Field:   m,
			Message: "値が設定されていません",
		})
	}
	return details
}

// containsUnresolvedPlaceholder は本文に未展開のプレースホルダが残っているかを判定する
func containsUnresolvedPlaceholder(body string) bool {
	// Go の fmt パッケージが欠損・型不一致時に出力するマーカー
	markers := []string{"%!s(MISSING)", "%!d(MISSING)", "%!", "{{", "}}"}
	for _, m := range markers {
		if strings.Contains(body, m) {
			return true
		}
	}
	return false
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(sendApprovalEmailHandler, middleware.RoleAdmin)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
