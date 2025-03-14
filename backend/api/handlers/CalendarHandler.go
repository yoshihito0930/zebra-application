package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

type Reservation struct {
	ID   int    `json:"id"`
	Type string `json:"type"`
	User string `json:"user"`
}

// 日ごとのカレンダー情報
type CalendarDay struct {
	Date               string        `json:"date"`
	Reserved           bool          `json:"reserved"`
	ReservationDetails []Reservation `json:"reservation_details,omitempty"`
}

// カレンダーレスポンス
type CalendarResponse struct {
	Year  int           `json:"year"`
	Month int           `json:"month"`
	Days  []CalendarDay `json:"days"`
}

// 仮の予約データ（本来はDBから取得）
var reservations = map[string][]Reservation{
	"2025-03-02": {{ID: 1, Type: "confirmed"}},
	"2025-03-10": {{ID: 2, Type: "tentative"}},
}

func CalendarHandler(w http.ResponseWriter, r *http.Request) {
	// クエリパラメーターから月を取得
	queryDate := r.URL.Query().Get("date")
	now := time.Now()

	var year int
	var month int

	if queryDate == "" {
		year = now.Year()
		month = int(now.Month())
	} else {
		parsedTime, err := time.Parse("2006-01", queryDate)
		if err != nil {
			http.Error(w, "invalid date format, use YYYY-MM", http.StatusBadRequest)
			return
		}
		year = parsedTime.Year()
		month = int(parsedTime.Month())
	}

	// 指定月の日数を取得
	daysInMonth := daysInMonth(year, month)
	calendar := CalendarResponse{
		Year:  year,
		Month: month,
		Days:  []CalendarDay{},
	}

	// カレンダーの日付を作成
	for day := 1; day <= daysInMonth; day++ {
		dateStr := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

		// 予約の有無を確認
		reservationsForDay, exists := reservations[dateStr]
		calendarDay := CalendarDay{
			Date:               dateStr,
			Reserved:           exists,
			ReservationDetails: reservationsForDay,
		}

		calendar.Days = append(calendar.Days, calendarDay)
	}

	// JSON レスポンスを返す
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(calendar)
}

func daysInMonth(year int, month int) int {
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}
