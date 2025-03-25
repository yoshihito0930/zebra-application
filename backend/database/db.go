package database

import (
	"database/sql"
	"fmt"
	"log"
)

func InitDB() *sql.DB {
	host := "db"
	port := 5431
	user := "zebra"
	password := "zebra"
	dbname := "zebrabase"

	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Unable to ping database: %v\n", err)
	}
	log.Println("Successfully connected to database!")
	return db
}
