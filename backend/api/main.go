package main

import (
	"log"
	"net/http"
)

func main() {
	// ルーターをセットアップ
	router := SetupRouter()

	// サーバをポート8080で起動
	log.Println("Starting server on :8080")
	err := http.ListenAndServe(":8080", router)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
