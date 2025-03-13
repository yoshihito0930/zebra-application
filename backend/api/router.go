package main

import (
	"fmt"
	"net/http"
)

func SetupRouter() http.Handler {
	// http.ServeMuxを利用してルートごとのハンドラーを設定
	mux := http.NewServeMux()

	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		// 何もしない（空レスポンスを返す）
		w.WriteHeader(http.StatusNoContent)
	})

	// ルートパス"/"にアクセスされた場合、"Hello World!"を返す
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// fmt.Println(w, "Hello, World!")
		fmt.Println("Method:", r.Method, "Path:", r.URL.Path)
		w.Write(([]byte)("Hello, World!"))

	})

	// ルートパス"/ping"にアクセスされた場合、"pong"を返す
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		// fmt.Println(w, "pong")
		fmt.Println("Method:", r.Method, "Path:", r.URL.Path)
		w.Write(([]byte)("pong"))
	})

	return mux
}
