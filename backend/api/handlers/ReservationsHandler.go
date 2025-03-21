package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type reservation struct {
	Id                 int    `json:"id"`
	UserId             int    `json:"user_id"`
	Date               string `json:"date"`
	StartTime          string `json:"start_time"`
	EndTime            string `json:"end_time"`
	Status             string `json:"status"`
	ReservationType    string `json:"reservation_type"`
	NeedsProtection    bool   `json:"needs_protection"`
	NumberOfPeople     int    `json:"number_of_people"`
	PlanType           string `json:"plan_type"`
	EquipmentInsurance bool   `json:"equipment_insurance"`
	Optinos            string `json:"options"`
	ShootingType       string `json:"shooting_type"`
	ShootingDetails    string `json:"shooting_details"`
	PhotgrapherName    string `json:"photographer_name"`
}

// 仮データ
var reservation_info = []reservation{
	{
		Id:                 1,
		UserId:             1,
		Date:               "2025-03-20",
		StartTime:          "10:00",
		EndTime:            "15:00",
		Status:             "pending",
		ReservationType:    "confirmed",
		NeedsProtection:    true,
		NumberOfPeople:     5,
		PlanType:           "A",
		EquipmentInsurance: false,
		Optinos:            "",
		ShootingType:       "stills",
		ShootingDetails:    "子猫の撮影",
		PhotgrapherName:    "石原 ひこね",
	},
	{
		Id:                 2,
		UserId:             2,
		Date:               "2025-03-21",
		StartTime:          "10:00",
		EndTime:            "15:00",
		Status:             "pending",
		ReservationType:    "confirmed",
		NeedsProtection:    true,
		NumberOfPeople:     2,
		PlanType:           "A",
		EquipmentInsurance: false,
		Optinos:            "",
		ShootingType:       "stills",
		ShootingDetails:    "猫の撮影",
		PhotgrapherName:    "石原 ひこね",
	},
	{
		Id:                 3,
		UserId:             1,
		Date:               "2025-03-22",
		StartTime:          "10:00",
		EndTime:            "15:00",
		Status:             "pending",
		ReservationType:    "confirmed",
		NeedsProtection:    true,
		NumberOfPeople:     6,
		PlanType:           "A",
		EquipmentInsurance: false,
		Optinos:            "",
		ShootingType:       "stills",
		ShootingDetails:    "子の撮影",
		PhotgrapherName:    "石原 ひこね",
	},
}

func ReservationsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	queryUserId := r.URL.Query().Get("user_id")

	switch r.Method {
	case http.MethodGet: // ユーザーの予約一覧を取得 (GET /reservations)
		// クエリがない場合、userIdを指定するようエラーを返す
		if queryUserId == "" {
			http.Error(w, "use \"user_id\" parametar", http.StatusBadRequest)
			return
		}

		// user_idを整数に変換
		userId, err := strconv.Atoi(queryUserId)
		if err != nil {
			http.Error(w, "Invalid user_id", http.StatusBadRequest)
			return
		}

		// 指定されたUserIdの予約をフィルタリング
		var filterdReservations []reservation
		for _, reservation := range reservation_info {
			if reservation.UserId == userId {
				filterdReservations = append(filterdReservations, reservation)
			}
		}

		// 該当する予約がない場合、空のリストを返す
		json.NewEncoder(w).Encode(filterdReservations)

	case http.MethodPost:
		// 新規予約の申し込み  (POST /reservations)
	case http.MethodPut:
		// 予約変更依頼 (PUT /reservations/{id})
	case http.MethodDelete:
		// 予約キャンセル依頼 (DELETE /reservations/{id})
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
