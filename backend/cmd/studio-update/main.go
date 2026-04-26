package main

import (
	"context"
	"encoding/json"
	"log"
	"regexp"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

var (
	studioRepo *dynamodbRepo.StudioRepositoryImpl
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	studioRepo = dynamodbRepo.NewStudioRepository(dynamoClient).(*dynamodbRepo.StudioRepositoryImpl)
}

type UpdateStudioRequest struct {
	StudioName          *string   `json:"studio_name,omitempty"`
	StudioAddress       *string   `json:"studio_address,omitempty"`
	PhoneNumber         *string   `json:"phone_number,omitempty"`
	Email               *string   `json:"email,omitempty"`
	BusinessHoursStart  *string   `json:"business_hours_start,omitempty"`
	BusinessHoursEnd    *string   `json:"business_hours_end,omitempty"`
	RegularHolidays     []string  `json:"regular_holidays,omitempty"`
	TentativeExpiryDays *int      `json:"tentative_expiry_days,omitempty"`
	CancellationPolicy  *string   `json:"cancellation_policy,omitempty"`
	IsActive            *bool     `json:"is_active,omitempty"`
}

type StudioResponse struct {
	StudioID            string   `json:"studio_id"`
	StudioName          string   `json:"studio_name"`
	StudioAddress       string   `json:"studio_address"`
	PhoneNumber         string   `json:"phone_number"`
	Email               string   `json:"email"`
	BusinessHoursStart  string   `json:"business_hours_start"`
	BusinessHoursEnd    string   `json:"business_hours_end"`
	RegularHolidays     []string `json:"regular_holidays,omitempty"`
	TentativeExpiryDays int      `json:"tentative_expiry_days"`
	CancellationPolicy  *string  `json:"cancellation_policy,omitempty"`
	IsActive            bool     `json:"is_active"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
}

// validateTimeFormat は時刻がHH:MM形式かどうかを検証する
func validateTimeFormat(timeStr string, fieldName string, validationResult *validator.ValidationResult) {
	matched, _ := regexp.MatchString(`^([01][0-9]|2[0-3]):[0-5][0-9]$`, timeStr)
	if !matched {
		validationResult.AddError(fieldName, "HH:MM形式で指定してください（例: 10:00）")
	}
}

// validateEmail はメールアドレスの形式を検証する
func validateEmail(email string, fieldName string, validationResult *validator.ValidationResult) {
	emailRegex := `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(emailRegex, email)
	if !matched {
		validationResult.AddError(fieldName, "有効なメールアドレスを指定してください")
	}
}

// validatePhoneNumber は電話番号の形式を検証する
func validatePhoneNumber(phone string, fieldName string, validationResult *validator.ValidationResult) {
	// ハイフンあり/なし両対応（例: 03-1234-5678、0312345678）
	phoneRegex := `^[0-9]{2,4}-?[0-9]{2,4}-?[0-9]{3,4}$`
	matched, _ := regexp.MatchString(phoneRegex, phone)
	if !matched {
		validationResult.AddError(fieldName, "有効な電話番号を指定してください")
	}
}

// validateRegularHolidays は定休日の妥当性を検証する
func validateRegularHolidays(holidays []string, validationResult *validator.ValidationResult) {
	validDays := map[string]bool{
		"sunday":    true,
		"monday":    true,
		"tuesday":   true,
		"wednesday": true,
		"thursday":  true,
		"friday":    true,
		"saturday":  true,
	}

	for _, day := range holidays {
		if !validDays[day] {
			validationResult.AddError("regular_holidays", "有効な曜日を指定してください（sunday, monday, tuesday, wednesday, thursday, friday, saturday）")
			return
		}
	}
}

func updateStudioHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// スタジオIDを取得（admin権限チェック済み）
	studioID, ok := request.RequestContext.Authorizer["studio_id"].(string)
	if !ok || studioID == "" {
		return response.ErrorWithCORS(apierror.ErrForbiddenRole), nil
	}

	// パスパラメータのスタジオIDと認証情報のスタジオIDが一致するか確認
	pathStudioID := request.PathParameters["id"]
	if pathStudioID != studioID {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	var req UpdateStudioRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	if req.StudioName != nil {
		validator.ValidateStringLength(*req.StudioName, "studio_name", 1, 100, validationResult)
	}

	if req.StudioAddress != nil {
		validator.ValidateStringLength(*req.StudioAddress, "studio_address", 1, 200, validationResult)
	}

	if req.PhoneNumber != nil {
		validatePhoneNumber(*req.PhoneNumber, "phone_number", validationResult)
	}

	if req.Email != nil {
		validateEmail(*req.Email, "email", validationResult)
	}

	if req.BusinessHoursStart != nil {
		validateTimeFormat(*req.BusinessHoursStart, "business_hours_start", validationResult)
	}

	if req.BusinessHoursEnd != nil {
		validateTimeFormat(*req.BusinessHoursEnd, "business_hours_end", validationResult)
	}

	if req.RegularHolidays != nil {
		validateRegularHolidays(req.RegularHolidays, validationResult)
	}

	if req.TentativeExpiryDays != nil && (*req.TentativeExpiryDays < 1 || *req.TentativeExpiryDays > 365) {
		validationResult.AddError("tentative_expiry_days", "仮予約の有効期限は1日から365日の範囲で指定してください")
	}

	if req.CancellationPolicy != nil {
		validator.ValidateStringLength(*req.CancellationPolicy, "cancellation_policy", 0, 1000, validationResult)
	}

	// 営業時間の整合性チェック（両方指定されている場合）
	if req.BusinessHoursStart != nil && req.BusinessHoursEnd != nil {
		if *req.BusinessHoursStart >= *req.BusinessHoursEnd {
			validationResult.AddError("business_hours_end", "営業終了時刻は営業開始時刻より後である必要があります")
		}
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// スタジオ取得
	studio, err := studioRepo.FindByID(ctx, studioID)
	if err != nil {
		log.Printf("Failed to get studio: %v", err)
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	// フィールド更新
	if req.StudioName != nil {
		studio.StudioName = *req.StudioName
	}
	if req.StudioAddress != nil {
		studio.StudioAddress = *req.StudioAddress
	}
	if req.PhoneNumber != nil {
		studio.PhoneNumber = *req.PhoneNumber
	}
	if req.Email != nil {
		studio.Email = *req.Email
	}
	if req.BusinessHoursStart != nil {
		studio.BusinessHoursStart = *req.BusinessHoursStart
	}
	if req.BusinessHoursEnd != nil {
		studio.BusinessHoursEnd = *req.BusinessHoursEnd
	}
	if req.RegularHolidays != nil {
		studio.RegularHolidays = req.RegularHolidays
	}
	if req.TentativeExpiryDays != nil {
		studio.TentativeExpiryDays = *req.TentativeExpiryDays
	}
	if req.CancellationPolicy != nil {
		studio.CancellationPolicy = req.CancellationPolicy
	}
	if req.IsActive != nil {
		studio.IsActive = *req.IsActive
	}
	studio.UpdatedAt = time.Now()

	// スタジオ更新
	if err := studioRepo.Update(ctx, studio); err != nil {
		log.Printf("Failed to update studio: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	resp := StudioResponse{
		StudioID:            studio.StudioID,
		StudioName:          studio.StudioName,
		StudioAddress:       studio.StudioAddress,
		PhoneNumber:         studio.PhoneNumber,
		Email:               studio.Email,
		BusinessHoursStart:  studio.BusinessHoursStart,
		BusinessHoursEnd:    studio.BusinessHoursEnd,
		RegularHolidays:     studio.RegularHolidays,
		TentativeExpiryDays: studio.TentativeExpiryDays,
		CancellationPolicy:  studio.CancellationPolicy,
		IsActive:            studio.IsActive,
		CreatedAt:           studio.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           studio.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(updateStudioHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
