package main

import (
	"net/http"

	"zebra-application/backend/api/handlers"
)

func SetupRouter() http.Handler {
	// http.ServeMuxを利用してルートごとのハンドラーを設定
	mux := http.NewServeMux()

	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		// 何もしない（空レスポンスを返す）
		w.WriteHeader(http.StatusNoContent)
	})

	// calendar関連のハンドラーを設定
	mux.HandleFunc("/calendar", handlers.CalendarHandler)

	// /reservationに対するハンドラーを設定
	mux.HandleFunc("/reservations", handlers.ReservationsHandler)
	return mux
}
