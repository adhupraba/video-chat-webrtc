package main

import (
	"log"
	"math/rand"
	"sync"

	"github.com/gorilla/websocket"
)

type Participant struct {
	Host bool
	Conn *websocket.Conn
}

type RoomMap struct {
	Mutex sync.RWMutex
	Map   map[string][]Participant
}

// initialises the RoomMap struct
func (r *RoomMap) Init() {
	r.Map = make(map[string][]Participant)
}

// return slice of participants in a room
func (r *RoomMap) Get(roomId string) []Participant {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	return r.Map[roomId]
}

// generate a unique id and return it -> insert it in the hashmap
func (r *RoomMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	b := make([]rune, 8)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	roomId := string(b)
	r.Map[roomId] = []Participant{}

	return roomId
}

// create a participant and add it in the hashmap
func (r *RoomMap) InsertIntoRoom(roomId string, host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	log.Println("inserting into room with room id:", roomId)
	p := Participant{host, conn}
	r.Map[roomId] = append(r.Map[roomId], p)
}

// deletes the room with the roomId
func (r *RoomMap) DeleteRoom(roomId string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.Map, roomId)
}

func (r *RoomMap) RemoveUserFromRoom(roomId string, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	filteredParticipants := []Participant{}
	for _, participant := range AllRooms.Map[roomId] {
		if participant.Conn == conn {
			log.Println("closing connection of", participant)
			// conn.Close()
			continue
		}

		filteredParticipants = append(filteredParticipants, participant)
	}

	r.Map[roomId] = filteredParticipants
}

func (r *RoomMap) SendMessage(msg broadcastMsg) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	for _, client := range r.Map[msg.RoomID] {
		if client.Conn != msg.Client {
			err := client.Conn.WriteJSON(msg.Message)

			if err != nil {
				log.Fatal(err)
				client.Conn.Close()
			}
		}
	}
}
