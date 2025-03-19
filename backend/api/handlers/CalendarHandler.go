package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// 各日の予約詳細データ
type Reservations struct {
	Id        int    `json:"id"`
	Date      string `json:"date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

// レスポンスデータ
type Calendar struct {
	Date               string         `json:"date"`
	ReservationDetails []Reservations `json:"reservation_details"`
}

// カレンダーレスポンス
type CalendarResponse struct {
	Year  int        `json:"year"`
	Month int        `json:"month"`
	Days  []Calendar `json:"days"`
}

// 仮データ（本来はDBから取得）
var dayInfo = map[string][]Reservations{
	"2025-03-02": {
		{Id: 1, Date: "2025-03-02", StartTime: "10:00", EndTime: "12:00"},
		{Id: 2, Date: "2025-03-02", StartTime: "13:00", EndTime: "17:00"},
	},
	"2025-03-10": {
		{Id: 3, Date: "2025-03-10", StartTime: "14:00", EndTime: "16:00"},
	},
}

func daysInMonth(year int, month int) int {
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func CalendarHandler(w http.ResponseWriter, r *http.Request) {
	// クエリパラメーターから日付を取得
	queryDate := r.URL.Query().Get("date")
	now := time.Now()

	var year, month, day int
	isSpecificDay := false //日単位の検索かどうか

	if queryDate == "" {
		year = now.Year()
		month = int(now.Month())
		day = now.Day()
	} else if len(queryDate) == 7 { //YYYY-MM
		parsedTime, err := time.Parse("2006-01", queryDate)
		if err != nil {
			http.Error(w, "invalid date format, use YYYY-MM", http.StatusBadRequest)
			return
		}
		year = parsedTime.Year()
		month = int(parsedTime.Month())
	} else if len(queryDate) == 10 { // YYYY-MM-DD
		parsedTime, err := time.Parse("2006-01-02", queryDate)
		if err != nil {
			http.Error(w, "invalid date format, use YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		year = parsedTime.Year()
		month = int(parsedTime.Month())
		day = parsedTime.Day()
		isSpecificDay = true
	}

	// 日単位指定の場合
	if isSpecificDay {
		dateStr := fmt.Sprintf("%04d-%02d-%02d", year, month, day)
		reservationForDay, exists := dayInfo[dateStr]

		if exists {
			// 予約がある場合
			response := Calendar{
				Date:               dateStr,
				ReservationDetails: reservationForDay,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		} else {
			// 予約がない場合
			response := Calendar{
				Date: dateStr,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
		return
	}

	// 月単位指定の場合
	daysInMonth := daysInMonth(year, month)
	calendar := CalendarResponse{
		Year:  year,
		Month: month,
		Days:  []Calendar{},
	}

	// カレンダーの日付を作成
	for day := 1; day <= daysInMonth; day++ {
		dateStr := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

		// 予約の有無を確認
		reservationsForDay, exists := dayInfo[dateStr]

		// 予約がある場合は、予約情報のみを格納
		if exists {
			calendar.Days = append(calendar.Days, Calendar{
				Date:               dateStr,
				ReservationDetails: reservationsForDay,
			})
		} else {
			// 予約がない日
			calendar.Days = append(calendar.Days, Calendar{
				Date: dateStr,
			})
		}
	}

	// JSON レスポンスを返す
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(calendar)
}
