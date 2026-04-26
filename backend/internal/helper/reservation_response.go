package helper

import (
	"context"
	"log"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// ReservationResponse は予約レスポンスの共通構造
type ReservationResponse struct {
	ReservationID      string          `json:"reservation_id"`
	StudioID           string          `json:"studio_id"`
	UserID             string          `json:"user_id"`
	ReservationType    string          `json:"reservation_type"`
	Status             string          `json:"status"`
	Plan               PlanInfo        `json:"plan"`
	Options            []OptionInfo    `json:"options"`
	Date               string          `json:"date"`
	StartTime          string          `json:"start_time"`
	EndTime            string          `json:"end_time"`
	ShootingType       []string        `json:"shooting_type"`
	ShootingDetails    string          `json:"shooting_details"`
	PhotographerName   string          `json:"photographer_name"`
	NumberOfPeople     int             `json:"number_of_people"`
	NeedsProtection    bool            `json:"needs_protection"`
	EquipmentInsurance bool            `json:"equipment_insurance"`
	Note               string          `json:"note,omitempty"`
	CancelledBy        string          `json:"cancelled_by,omitempty"`
	CancelledAt        string          `json:"cancelled_at,omitempty"`
	PromotedFrom       string          `json:"promoted_from,omitempty"`
	PromotedAt         string          `json:"promoted_at,omitempty"`
	LinkedReservationID string         `json:"linked_reservation_id,omitempty"`
	CreatedAt          string          `json:"created_at"`
	UpdatedAt          string          `json:"updated_at"`
}

// PlanInfo はプラン情報
type PlanInfo struct {
	PlanID   string  `json:"plan_id"`
	PlanName string  `json:"plan_name"`
	Price    int     `json:"price"`
	TaxRate  float64 `json:"tax_rate"`
}

// OptionInfo はオプション情報
type OptionInfo struct {
	OptionID   string  `json:"option_id"`
	OptionName string  `json:"option_name"`
	Price      int     `json:"price"`
	TaxRate    float64 `json:"tax_rate"`
}

// BuildReservationResponse は予約エンティティからレスポンスを作成
func BuildReservationResponse(
	ctx context.Context,
	r *entity.Reservation,
	planRepo repository.PlanRepository,
	optionRepo repository.OptionRepository,
) ReservationResponse {
	// Planを取得
	var planInfo PlanInfo
	plan, err := planRepo.FindByID(ctx, r.StudioID, r.PlanID)
	if err != nil {
		log.Printf("Warning: Failed to fetch plan %s: %v", r.PlanID, err)
		planInfo = PlanInfo{PlanID: r.PlanID, PlanName: "Unknown Plan"}
	} else {
		planInfo = PlanInfo{
			PlanID:   plan.PlanID,
			PlanName: plan.PlanName,
			Price:    plan.Price,
			TaxRate:  plan.TaxRate,
		}
	}

	// Optionsを取得
	options := make([]OptionInfo, 0, len(r.Options))
	for _, optionID := range r.Options {
		option, err := optionRepo.FindByID(ctx, r.StudioID, optionID)
		if err != nil {
			log.Printf("Warning: Failed to fetch option %s: %v", optionID, err)
			continue
		}
		options = append(options, OptionInfo{
			OptionID:   option.OptionID,
			OptionName: option.OptionName,
			Price:      option.Price,
			TaxRate:    option.TaxRate,
		})
	}

	resp := ReservationResponse{
		ReservationID:      r.ReservationID,
		StudioID:           r.StudioID,
		UserID:             func() string { if r.UserID != nil { return *r.UserID }; return "" }(),
		ReservationType:    string(r.ReservationType),
		Status:             string(r.Status),
		Plan:               planInfo,
		Options:            options,
		Date:               r.Date.Format("2006-01-02"),
		StartTime:          r.StartTime,
		EndTime:            r.EndTime,
		ShootingType:       r.ShootingType,
		ShootingDetails:    r.ShootingDetails,
		PhotographerName:   r.PhotographerName,
		NumberOfPeople:     r.NumberOfPeople,
		NeedsProtection:    r.NeedsProtection,
		EquipmentInsurance: r.EquipmentInsurance,
		CreatedAt:          r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          r.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// オプショナルフィールド
	if r.Note != nil {
		resp.Note = *r.Note
	}
	if r.CancelledBy != nil {
		resp.CancelledBy = string(*r.CancelledBy)
		if r.CancelledAt != nil {
			resp.CancelledAt = r.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
		}
	}
	if r.PromotedFrom != nil {
		resp.PromotedFrom = string(*r.PromotedFrom)
		if r.PromotedAt != nil {
			resp.PromotedAt = r.PromotedAt.Format("2006-01-02T15:04:05Z07:00")
		}
	}
	if r.LinkedReservationID != nil {
		resp.LinkedReservationID = *r.LinkedReservationID
	}

	return resp
}
