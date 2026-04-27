package ws

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Message struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type client struct {
	conn     *websocket.Conn
	trekCode string
	send     chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*client]struct{} // trekCode → clients
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]map[*client]struct{})}
}

func (h *Hub) Broadcast(trekCode string, msg Message) {
	data, _ := json.Marshal(msg)
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients[trekCode] {
		select {
		case c.send <- data:
		default:
		}
	}
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	trekCode := r.PathValue("code")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	c := &client{conn: conn, trekCode: trekCode, send: make(chan []byte, 64)}
	h.register(c)
	defer h.unregister(c)

	go func() {
		for data := range c.send {
			if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		}
	}()

	// Read loop (keeps connection alive, handles client pings)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *Hub) register(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[c.trekCode] == nil {
		h.clients[c.trekCode] = make(map[*client]struct{})
	}
	h.clients[c.trekCode][c] = struct{}{}
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients[c.trekCode], c)
	close(c.send)
}
