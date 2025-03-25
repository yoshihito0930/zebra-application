package main

import (
	"log"
	"net/http"

	"zebra-application/backend/api/handlers"
	"zebra-application/backend/database"
)

func main() {
	// ルーターをセットアップ
	router := SetupRouter()

	// DB接続
	db := database.InitDB()
	defer db.Close()

	// ハンドラーにDB接続をセット
	handlers.SetDB(db) // 追加

	// サーバをポート8080で起動
	log.Println("Starting server on :8080")
	err := http.ListenAndServe(":8080", router)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
