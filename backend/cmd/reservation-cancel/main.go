package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/notification"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

var (
	reservationUsecase *usecase.ReservationUsecase
	optionRepo         repository.OptionRepository
	userRepo           repository.UserRepository
	emailService       *notification.EmailService
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	sesClient := sesv2.NewFromConfig(cfg)
	emailService = notification.NewEmailService(sesClient)

	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo := dynamodbRepo.NewPlanRepository(dynamoClient)
	optionRepo = dynamodbRepo.NewOptionRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepo,
		optionRepo,
		blockedSlotRepo,
		studioRepo,
	)
}

type CancelReservationResponse struct {
	ReservationID string `json:"reservation_id"`
	Status        string `json:"status"`
	CancelledBy   string `json:"cancelled_by"`
	CancelledAt   string `json:"cancelled_at"`
}

func cancelReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	// コンテキストからロールとユーザーIDを取得
	role := middleware.GetRoleFromContext(ctx)
	userID := middleware.GetUserIDFromContext(ctx)

	// 予約を取得して所有者チェック（顧客の場合のみ）
	reservation, err := reservationUsecase.GetReservation(ctx, reservationID)
	if err != nil {
		if err == apierror.ErrReservationNotFound {
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		}
		log.Printf("Failed to get reservation: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// 顧客は自分の予約のみキャンセル可能
	// UserIDの型変換と比較（*string → string）
	if role == string(middleware.RoleCustomer) && (reservation.UserID == nil || *reservation.UserID != userID) {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// キャンセル実行者を判定
	var cancelledBy entity.CancelledBy
	if role == string(middleware.RoleAdmin) {
		cancelledBy = entity.CancelledByOwner // 管理者がキャンセル
	} else {
		cancelledBy = entity.CancelledByCustomer // 顧客がキャンセル
	}

	// 予約をキャンセル
	reservation, err = reservationUsecase.CancelReservation(ctx, reservationID, cancelledBy)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to cancel reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// 予約者宛と管理者宛にキャンセル通知メールを送信（失敗時もログのみでキャンセルは成立させる）
	var customer *entity.User
	if reservation.IsGuest {
		if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
			log.Printf("guest email is empty for reservation %s, skipping cancellation email", reservation.ReservationID)
		} else if err := emailService.SendGuestReservationCancellation(ctx, reservation); err != nil {
			log.Printf("failed to send guest reservation cancellation email (reservation_id=%s): %v", reservation.ReservationID, err)
		}
	} else {
		if reservation.UserID == nil || *reservation.UserID == "" {
			log.Printf("user_id is empty for reservation %s, skipping cancellation email", reservation.ReservationID)
		} else {
			user, userErr := userRepo.FindByID(ctx, *reservation.UserID)
			if userErr != nil {
				log.Printf("failed to find user for cancellation email (user_id=%s): %v", *reservation.UserID, userErr)
			} else if user == nil {
				log.Printf("user not found for cancellation email (user_id=%s)", *reservation.UserID)
			} else {
				customer = user
				if err := emailService.SendCustomerReservationCancellation(ctx, reservation, user); err != nil {
					log.Printf("failed to send customer reservation cancellation email (reservation_id=%s): %v", reservation.ReservationID, err)
				}
			}
		}
	}

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
		if err := emailService.SendAdminReservationCancellationNotification(ctx, reservation, customer, adminEmails); err != nil {
			log.Printf("failed to send admin reservation cancellation notification: %v", err)
		}
	} else {
		log.Printf("no admin found for studio %s, skipping admin cancellation notification", reservation.StudioID)
	}

	// レスポンスを作成
	resp := CancelReservationResponse{
		ReservationID: reservation.ReservationID,
		Status:        string(reservation.Status),
	}

	// CancelledByとCancelledAtは必ず設定されているはず
	if reservation.CancelledBy != nil {
		resp.CancelledBy = string(*reservation.CancelledBy)
	}
	if reservation.CancelledAt != nil {
		resp.CancelledAt = reservation.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(cancelReservationHandler, middleware.RoleCustomer, middleware.RoleAdmin)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
