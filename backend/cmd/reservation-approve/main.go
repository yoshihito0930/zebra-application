package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
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

type ApproveReservationResponse struct {
	ReservationID   string `json:"reservation_id"`
	ReservationType string `json:"reservation_type"`
	Status          string `json:"status"`
}

func approveReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	// 予約を承認
	reservation, err := reservationUsecase.ApproveReservation(ctx, reservationID)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to approve reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// 予約者宛に承認通知メールを送信（失敗時もログのみで承認は成立させる）
	if reservation.IsGuest {
		if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
			log.Printf("guest email is empty for reservation %s, skipping approval email", reservation.ReservationID)
		} else if err := emailService.SendGuestReservationApproval(ctx, reservation); err != nil {
			log.Printf("failed to send guest reservation approval email (reservation_id=%s): %v", reservation.ReservationID, err)
		}
	} else {
		if reservation.UserID == nil || *reservation.UserID == "" {
			log.Printf("user_id is empty for reservation %s, skipping approval email", reservation.ReservationID)
		} else {
			user, userErr := userRepo.FindByID(ctx, *reservation.UserID)
			if userErr != nil {
				log.Printf("failed to find user for approval email (user_id=%s): %v", *reservation.UserID, userErr)
			} else if user == nil {
				log.Printf("user not found for approval email (user_id=%s)", *reservation.UserID)
			} else if err := emailService.SendCustomerReservationApproval(ctx, reservation, user); err != nil {
				log.Printf("failed to send customer reservation approval email (reservation_id=%s): %v", reservation.ReservationID, err)
			}
		}
	}

	resp := ApproveReservationResponse{
		ReservationID:   reservation.ReservationID,
		ReservationType: string(reservation.ReservationType),
		Status:          string(reservation.Status),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(approveReservationHandler, middleware.RoleAdmin)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
