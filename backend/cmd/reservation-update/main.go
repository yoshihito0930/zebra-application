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
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/notification"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
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

type UpdateReservationRequest struct {
	Date            *string `json:"date,omitempty"`
	StartTime       *string `json:"start_time,omitempty"`
	EndTime         *string `json:"end_time,omitempty"`
	Note            *string `json:"note,omitempty"`
	ShootingDetails *string `json:"shooting_details,omitempty"`
}

type UpdateReservationResponse struct {
	ReservationID string `json:"reservation_id"`
	Status        string `json:"status"`
	Date          string `json:"date"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	UpdatedAt     string `json:"updated_at"`
}

func updateReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	var req UpdateReservationRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	if req.Date != nil {
		if validator.ValidateDateFormat(*req.Date, "date", validationResult) {
			validator.ValidateDateNotPast(*req.Date, "date", validationResult)
		}
	}

	if req.StartTime != nil {
		validator.ValidateTimeFormat(*req.StartTime, "start_time", validationResult)
	}

	if req.EndTime != nil {
		validator.ValidateTimeFormat(*req.EndTime, "end_time", validationResult)
	}

	if req.StartTime != nil && req.EndTime != nil {
		validator.ValidateTimeRange(*req.StartTime, *req.EndTime, validationResult)
	}

	if req.Note != nil {
		validator.ValidateStringLength(*req.Note, "note", 0, 500, validationResult)
	}

	if req.ShootingDetails != nil {
		validator.ValidateStringLength(*req.ShootingDetails, "shooting_details", 1, 500, validationResult)
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// ユースケースの入力データを作成
	input := usecase.UpdateReservationInput{
		ReservationID: reservationID,
	}

	if req.Date != nil {
		date, _ := time.Parse("2006-01-02", *req.Date)
		input.Date = &date
	}

	if req.StartTime != nil {
		input.StartTime = req.StartTime
	}

	if req.EndTime != nil {
		input.EndTime = req.EndTime
	}

	if req.Note != nil {
		input.Note = req.Note
	}

	if req.ShootingDetails != nil {
		input.ShootingDetails = req.ShootingDetails
	}

	// 予約を更新
	reservation, err := reservationUsecase.UpdateReservation(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		case apierror.ErrReservationConflict:
			return response.ErrorWithCORS(apierror.ErrReservationConflict), nil
		case apierror.ErrBufferTimeConflict:
			return response.ErrorWithCORS(apierror.ErrBufferTimeConflict), nil
		case apierror.ErrBlockedSlotConflict:
			return response.ErrorWithCORS(apierror.ErrBlockedSlotConflict), nil
		default:
			log.Printf("Failed to update reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// 予約者宛と管理者宛に更新通知メールを送信（失敗時もログのみで更新は成立させる）
	var customer *entity.User
	if reservation.IsGuest {
		if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
			log.Printf("guest email is empty for reservation %s, skipping update email", reservation.ReservationID)
		} else if reservation.GuestToken == nil || *reservation.GuestToken == "" {
			log.Printf("guest token is empty for reservation %s, skipping update email", reservation.ReservationID)
		} else if err := emailService.SendGuestReservationUpdate(ctx, reservation); err != nil {
			log.Printf("failed to send guest reservation update email (reservation_id=%s): %v", reservation.ReservationID, err)
		}
	} else {
		if reservation.UserID == nil || *reservation.UserID == "" {
			log.Printf("user_id is empty for reservation %s, skipping update email", reservation.ReservationID)
		} else {
			user, userErr := userRepo.FindByID(ctx, *reservation.UserID)
			if userErr != nil {
				log.Printf("failed to find user for update email (user_id=%s): %v", *reservation.UserID, userErr)
			} else if user == nil {
				log.Printf("user not found for update email (user_id=%s)", *reservation.UserID)
			} else {
				customer = user
				if err := emailService.SendCustomerReservationUpdate(ctx, reservation, user); err != nil {
					log.Printf("failed to send customer reservation update email (reservation_id=%s): %v", reservation.ReservationID, err)
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
		if err := emailService.SendAdminReservationUpdateNotification(ctx, reservation, customer, adminEmails); err != nil {
			log.Printf("failed to send admin reservation update notification: %v", err)
		}
	} else {
		log.Printf("no admin found for studio %s, skipping admin update notification", reservation.StudioID)
	}

	resp := UpdateReservationResponse{
		ReservationID: reservation.ReservationID,
		Status:        string(reservation.Status),
		Date:          reservation.Date.Format("2006-01-02"),
		StartTime:     reservation.StartTime,
		EndTime:       reservation.EndTime,
		UpdatedAt:     reservation.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(updateReservationHandler, middleware.RoleAdmin)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
