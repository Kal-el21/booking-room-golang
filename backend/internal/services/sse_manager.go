package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
)

// SSEClient represents a connected SSE client
type SSEClient struct {
	UserID     uint
	Channel    chan SSEMessage
	LastPingAt time.Time
}

// SSEMessage represents a message sent to client
type SSEMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// NotificationEvent for SSE
type NotificationEvent struct {
	Type         string                      `json:"type"`
	Notification models.NotificationResponse `json:"notification"`
}

// SSEManager manages SSE connections
type SSEManager struct {
	clients    map[uint][]*SSEClient // userID -> []clients
	register   chan *SSEClient
	unregister chan *SSEClient
	broadcast  chan BroadcastMessage
	mu         sync.RWMutex
}

// BroadcastMessage for broadcasting to specific user
type BroadcastMessage struct {
	UserID       uint
	Notification models.Notification
}

var (
	sseManager     *SSEManager
	sseManagerOnce sync.Once
)

// GetSSEManager returns singleton instance of SSEManager
func GetSSEManager() *SSEManager {
	sseManagerOnce.Do(func() {
		sseManager = &SSEManager{
			clients:    make(map[uint][]*SSEClient),
			register:   make(chan *SSEClient),
			unregister: make(chan *SSEClient),
			broadcast:  make(chan BroadcastMessage, 100),
		}
		go sseManager.run()
		go sseManager.pingClients()
	})
	return sseManager
}

// run handles SSE manager operations
func (m *SSEManager) run() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("SSE: Panic recovered in run(): %v", r)
		}
	}()
	for {
		select {
		case client := <-m.register:
			m.mu.Lock()
			m.clients[client.UserID] = append(m.clients[client.UserID], client)
			m.mu.Unlock()
			log.Printf("SSE: Client registered for user %d. Total clients: %d", client.UserID, len(m.clients[client.UserID]))

		case client := <-m.unregister:
			m.mu.Lock()
			if clients, ok := m.clients[client.UserID]; ok {
				for i, c := range clients {
					if c == client {
						// Remove client from slice
						m.clients[client.UserID] = append(clients[:i], clients[i+1:]...)
						close(client.Channel)
						break
					}
				}
				// Remove user entry if no more clients
				if len(m.clients[client.UserID]) == 0 {
					delete(m.clients, client.UserID)
				}
			}
			m.mu.Unlock()
			log.Printf("SSE: Client unregistered for user %d", client.UserID)

		case msg := <-m.broadcast:
			m.mu.RLock()
			clients := m.clients[msg.UserID]
			m.mu.RUnlock()

			if len(clients) > 0 {
				// Create notification event
				event := NotificationEvent{
					Type:         "notification",
					Notification: msg.Notification.ToResponse(),
				}

				message := SSEMessage{
					Event: "notification",
					Data:  event,
				}

				// Send to all clients of this user
				for _, client := range clients {
					select {
					case client.Channel <- message:
						log.Printf("SSE: Notification sent to user %d", msg.UserID)
					default:
						log.Printf("SSE: Client channel full for user %d, skipping", msg.UserID)
					}
				}
			}
		}
	}
}

// pingClients sends periodic ping to keep connections alive
func (m *SSEManager) pingClients() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("SSE: Panic recovered in pingClients(): %v", r)
		}
	}()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.mu.RLock()
		for userID, clients := range m.clients {
			for _, client := range clients {
				select {
				case client.Channel <- SSEMessage{
					Event: "ping",
					Data:  map[string]interface{}{"timestamp": time.Now().Unix()},
				}:
					client.LastPingAt = time.Now()
				default:
					log.Printf("SSE: Ping failed for user %d", userID)
				}
			}
		}
		m.mu.RUnlock()
	}
}

// RegisterClient registers a new SSE client
func (m *SSEManager) RegisterClient(userID uint) *SSEClient {
	client := &SSEClient{
		UserID:     userID,
		Channel:    make(chan SSEMessage, 10),
		LastPingAt: time.Now(),
	}
	m.register <- client
	return client
}

// UnregisterClient unregisters an SSE client
func (m *SSEManager) UnregisterClient(client *SSEClient) {
	m.unregister <- client
}

// BroadcastToUser sends notification to specific user
func (m *SSEManager) BroadcastToUser(userID uint, notification models.Notification) {
	m.broadcast <- BroadcastMessage{
		UserID:       userID,
		Notification: notification,
	}
}

// FormatSSEMessage formats message for SSE protocol
func FormatSSEMessage(msg SSEMessage) string {
	data, _ := json.Marshal(msg.Data)
	return fmt.Sprintf("event: %s\ndata: %s\n\n", msg.Event, string(data))
}
