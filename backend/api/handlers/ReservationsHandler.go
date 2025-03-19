package handlers

import "net/http"

func ReservationsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// ユーザーの予約一覧を取得 (GET /reservations)
	case http.MethodPost:
		// 新規予約の申し込み  (POST /reservations)
	case http.MethodPut:
		// 予約変更依頼 (PUT /reservations/{id})
	case http.MethodDelete:
		// 予約削除依頼 (DELETE /reservations/{id})
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
