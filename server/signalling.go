package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// global hashmap
var AllRooms RoomMap

// create room and return room id
func CreateRoomReqHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	roomId := AllRooms.CreateRoom()

	type resp struct {
		RoomID string `json:"roomId"`
	}

	log.Println(AllRooms.Map)
	json.NewEncoder(w).Encode(resp{RoomID: roomId})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type broadcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client  *websocket.Conn
}

var broadcast = make(chan broadcastMsg)

func broadcaster() {
	for {
		msg := <-broadcast

		AllRooms.SendMessage(msg)
	}
}

// will join the client in the room
func JoinRoomReqHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	roomId := r.URL.Query().Get("roomId")

	if roomId == "" {
		log.Println("roomId is missing in URL parameters")
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Fatal("websocket upgrade error =>", err)
	}

	defer ws.Close()

	log.Println("pre insertion participants =>", AllRooms.Get(roomId))

	AllRooms.InsertIntoRoom(roomId, false, ws)

	log.Println("post insertion participants =>", AllRooms.Get(roomId))

	go broadcaster()

	for {
		var msg broadcastMsg

		err := ws.ReadJSON(&msg.Message)

		if err != nil {
			AllRooms.RemoveUserFromRoom(roomId, ws)
			log.Println("unable to read json from websocket =>", err)
			break
		}

		msg.Client = ws
		msg.RoomID = roomId

		log.Println("broadcasting msg =>", msg)

		broadcast <- msg
	}
}
