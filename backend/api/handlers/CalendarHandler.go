package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// 各日の予約データ構造体
type reservationForDay struct {
	//Date            customerDate `json:"date"`
	StartTime       customerTime `json:"start_time"`
	EndTime         customerTime `json:"end_time"`
	ReservationType string       `json:"reservation_type"`
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
		rows, err := db.Query("SELECT date, start_time, end_time, reservation_type FROM reservations WHERE date = $1", dateStr)
		if err != nil {
			http.Error(w, "Database query failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var dayReservation []reservationForDay
		for rows.Next() {
			var res reservationForDay
			err := rows.Scan(&res.StartTime, &res.EndTime, &res.ReservationType)
			if err != nil {
				http.Error(w, "Failed to scan row", http.StatusInternalServerError)
				return
			}
			dayReservation = append(dayReservation, res)
		}

		// 該当する予約がない場合、空のリストを返す
		json.NewEncoder(w).Encode(dayReservation)
	} else {
		// 月単位指定の場合
		daysInMonth := daysInMonth(year, month)
		/*
			calendar := calendarResponse{
				Year:  year,
				Month: month,
				Days:  []calendarDay{},
			}
		*/

		// 結果を格納するマップ
		calendar := make(map[string][]reservationForDay)

		// カレンダーの日付を作成
		for day := 1; day <= daysInMonth; day++ {
			dateStr := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

			rows, err := db.Query("SELECT start_time, end_time, reservation_type FROM reservations WHERE date = $1", dateStr)
			if err != nil {
				http.Error(w, "Database query failed", http.StatusInternalServerError)
				return
			}

			var dayReservation []reservationForDay = []reservationForDay{}
			for rows.Next() {
				var res reservationForDay
				err := rows.Scan(&res.StartTime, &res.EndTime, &res.ReservationType)
				if err != nil {
					rows.Close()
					http.Error(w, "Failed to scan row", http.StatusInternalServerError)
					return
				}
				dayReservation = append(dayReservation, res)
			}
			defer rows.Close()

			// カレンダーマップに追加
			calendar[dateStr] = dayReservation

		}
		// 該当する予約がない場合、空のリストを返す
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(calendar)

	}
}
