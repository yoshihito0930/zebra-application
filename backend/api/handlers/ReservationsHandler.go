package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// 日時の出力フォーマットを定義
type customerDate time.Time

func (cd customerDate) MarshalJSON() ([]byte, error) {
	formatted := fmt.Sprintf("\"%s\"", time.Time(cd).Format("2006-01-02"))
	return []byte(formatted), nil
}

type customerTime time.Time

func (ct customerTime) MarshalJSON() ([]byte, error) {
	formatted := fmt.Sprintf("\"%s\"", time.Time(ct).Format("15:04"))
	return []byte(formatted), nil
}

type reservation struct {
	Id                 int          `json:"id"`
	UserId             int          `json:"user_id"`
	Date               customerDate `json:"date"`
	StartTime          customerTime `json:"start_time"`
	EndTime            customerTime `json:"end_time"`
	Status             string       `json:"status"`
	ReservationType    string       `json:"reservation_type"`
	NeedsProtection    bool         `json:"needs_protection"`
	NumberOfPeople     int          `json:"number_of_people"`
	PlanType           string       `json:"plan_type"`
	EquipmentInsurance bool         `json:"equipment_insurance"`
	Optinos            string       `json:"options"`
	ShootingType       string       `json:"shooting_type"`
	ShootingDetails    string       `json:"shooting_details"`
	PhotgrapherName    string       `json:"photographer_name"`
}

// DB接続用のグローバル変数
var db *sql.DB

// DB接続をハンドラーにセット
func SetDB(database *sql.DB) {
	db = database
}

func ReservationsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	queryUserId := r.URL.Query().Get("user_id")
	queryReservationId := r.URL.Query().Get("id")

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

		// データベースから指定されたUserIdの予約を取得
		rows, err := db.Query("SELECT * FROM reservations WHERE user_id = $1", userId)
		if err != nil {
			http.Error(w, "Database query failed", http.StatusInternalServerError)
			return
		}

		var reservations []reservation
		for rows.Next() {
			var res reservation
			err := rows.Scan(&res.Id, &res.UserId, &res.Date, &res.StartTime, &res.EndTime, &res.Status, &res.ReservationType, &res.NeedsProtection, &res.NumberOfPeople, &res.PlanType, &res.EquipmentInsurance, &res.Optinos, &res.ShootingType, &res.ShootingDetails, &res.PhotgrapherName)
			if err != nil {
				http.Error(w, "Failed to scan row", http.StatusInternalServerError)
				return
			}
			reservations = append(reservations, res)
		}

		// 該当する予約がない場合、空のリストを返す
		json.NewEncoder(w).Encode(reservations)

	case http.MethodPost:
		// 新規予約の申し込み  (POST /reservations)
		notifyAdminNewReservation()

	case http.MethodPut:
		// 予約変更依頼 (PUT /reservations?id={id})
		if queryReservationId == "" {
			http.Error(w, "use \"id\" parametar", http.StatusBadRequest)
			return
		}
		notifyAdminModifyReservation()

	case http.MethodDelete:
		// 予約キャンセル依頼 (DELETE /reservations?id={id})
		if queryReservationId == "" {
			http.Error(w, "use \"id\" parametar", http.StatusBadRequest)
			return
		}
		notifyAdminDeleteReservation()

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func notifyAdminNewReservation() {
	fmt.Println("新しい予約申し込みがあります")
}

func notifyAdminModifyReservation() {
	fmt.Println("予約の変更依頼があります")
}

func notifyAdminDeleteReservation() {
	fmt.Println("予約の削除依頼があります")
}
