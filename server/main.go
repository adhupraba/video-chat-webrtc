package main

import (
	"log"
	"net/http"
)

func main() {
	AllRooms.Init()

	http.HandleFunc("/create", CreateRoomReqHandler)
	http.HandleFunc("/join", JoinRoomReqHandler)

	log.Println("Starting server on post 8000")

	err := http.ListenAndServe(":8000", nil)

	if err != nil {
		log.Fatal(err)
	}
}
