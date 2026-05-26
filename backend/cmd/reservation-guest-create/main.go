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
	"github.com/yoshihito0930/zebra-application/internal/helper"
	"github.com/yoshihito0930/zebra-application/internal/notification"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	reservationUsecase *usecase.ReservationUsecase
	emailService       *notification.EmailService
	userRepo           repository.UserRepository
	planRepo           repository.PlanRepository
	optionRepo         repository.OptionRepository
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
	planRepo = dynamodbRepo.NewPlanRepository(dynamoClient)
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

// CreateGuestReservationRequest はゲスト予約作成リクエストの構造体
type CreateGuestReservationRequest struct {
	StudioID           string   `json:"studio_id"`
	ReservationType    string   `json:"reservation_type"`
	PlanID             string   `json:"plan_id"`
	Date               string   `json:"date"`
	StartTime          string   `json:"start_time"`
	EndTime            string   `json:"end_time"`
	Options            []string `json:"options"`
	ShootingType       []string `json:"shooting_type"`
	ShootingDetails    string   `json:"shooting_details"`
	PhotographerName   string   `json:"photographer_name"`
	NumberOfPeople     int      `json:"number_of_people"`
	NeedsProtection    bool     `json:"needs_protection"`
	EquipmentInsurance bool     `json:"equipment_insurance"`
	Note               string   `json:"note"`
	GuestName          string   `json:"guest_name"`
	GuestEmail         string   `json:"guest_email"`
	GuestPhone         string   `json:"guest_phone"`
	GuestCompany       string   `json:"guest_company"`
}

// CreateGuestReservationResponse はゲスト予約作成レスポンスの構造体
// guest_token を含める必要があるためカスタム構造体を使用する
type CreateGuestReservationResponse struct {
	helper.ReservationResponse
	GuestToken string `json:"guest_token"`
}

func createGuestReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req CreateGuestReservationRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	validationResult := &validator.ValidationResult{Valid: true}

	// 共通フィールドのバリデーション
	validator.ValidateRequired(req.StudioID, "studio_id", validationResult)
	validator.ValidateRequired(req.ReservationType, "reservation_type", validationResult)
	validator.ValidateRequired(req.PlanID, "plan_id", validationResult)
	validator.ValidateRequired(req.Date, "date", validationResult)
	validator.ValidateRequired(req.StartTime, "start_time", validationResult)
	validator.ValidateRequired(req.EndTime, "end_time", validationResult)
	validator.ValidateRequired(req.ShootingDetails, "shooting_details", validationResult)
	validator.ValidateRequired(req.PhotographerName, "photographer_name", validationResult)

	// ゲスト専用フィールドのバリデーション
	validator.ValidateRequired(req.GuestName, "guest_name", validationResult)
	validator.ValidateRequired(req.GuestEmail, "guest_email", validationResult)
	validator.ValidateRequired(req.GuestPhone, "guest_phone", validationResult)

	if req.GuestName != "" {
		validator.ValidateStringLength(req.GuestName, "guest_name", 1, 50, validationResult)
	}
	validator.ValidateEmailFormat(req.GuestEmail, "guest_email", validationResult)
	if req.GuestCompany != "" {
		validator.ValidateStringLength(req.GuestCompany, "guest_company", 1, 100, validationResult)
	}

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

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// 日付をパース
	date, _ := time.Parse("2006-01-02", req.Date)

	var note *string
	if req.Note != "" {
		note = &req.Note
	}
	var guestCompany *string
	if req.GuestCompany != "" {
		guestCompany = &req.GuestCompany
	}

	input := usecase.CreateGuestReservationInput{
		StudioID:           req.StudioID,
		GuestName:          req.GuestName,
		GuestEmail:         req.GuestEmail,
		GuestPhone:         req.GuestPhone,
		GuestCompany:       guestCompany,
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

	reservation, guestToken, err := reservationUsecase.CreateGuestReservation(ctx, input)
	if err != nil {
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
		case apierror.ErrOptionInactive:
			return response.ErrorWithCORS(apierror.ErrOptionInactive), nil
		default:
			log.Printf("Failed to create guest reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// 確認メールを送信（エラーはログのみ、処理は継続）
	if err := emailService.SendGuestReservationConfirmation(ctx, reservation, guestToken); err != nil {
		log.Printf("Failed to send guest reservation confirmation email: %v", err)
	}

	// 管理者宛にも新規予約通知を送信（エラーはログのみ）
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
		if err := emailService.SendAdminReservationNotification(ctx, reservation, nil, adminEmails); err != nil {
			log.Printf("failed to send admin reservation notification: %v", err)
		}
	} else {
		log.Printf("no admin found for studio %s, skipping admin notification", reservation.StudioID)
	}

	resp := CreateGuestReservationResponse{
		ReservationResponse: helper.BuildReservationResponse(ctx, reservation, planRepo, optionRepo, userRepo),
		GuestToken:          guestToken,
	}

	return response.CreatedWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// ゲスト予約作成は認証不要
	return createGuestReservationHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
