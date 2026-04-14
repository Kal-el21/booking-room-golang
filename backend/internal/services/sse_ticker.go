package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

// sseTicket menyimpan data tiket sementara
type sseTicket struct {
	UserID    uint
	ClientIP  string // IP yang boleh memakai tiket ini
	ExpiresAt time.Time
}

// SSETicketStore menyimpan tiket in-memory
type SSETicketStore struct {
	mu      sync.Mutex
	tickets map[string]sseTicket
}

var (
	ticketStoreInstance *SSETicketStore
	ticketStoreOnce     sync.Once
)

// GetSSETicketStore returns singleton instance
func GetSSETicketStore() *SSETicketStore {
	ticketStoreOnce.Do(func() {
		store := &SSETicketStore{
			tickets: make(map[string]sseTicket),
		}
		go store.cleanupLoop()
		ticketStoreInstance = store
	})
	return ticketStoreInstance
}

// Issue membuat tiket baru.
// Tiket hanya bisa dipakai oleh IP yang sama dan expired dalam 5 detik.
func (s *SSETicketStore) Issue(userID uint, clientIP string) (string, error) {
	b := make([]byte, 32) // 32 bytes = 256-bit entropy
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	ticket := hex.EncodeToString(b)

	s.mu.Lock()
	s.tickets[ticket] = sseTicket{
		UserID:    userID,
		ClientIP:  clientIP,
		ExpiresAt: time.Now().Add(5 * time.Second), // ← 5 detik saja
	}
	s.mu.Unlock()

	return ticket, nil
}

// Consume memvalidasi tiket dengan tiga syarat:
//  1. Tiket harus ada
//  2. Belum expired (max 5 detik)
//  3. Request datang dari IP yang sama saat tiket diterbitkan
//
// Tiket langsung dihapus setelah dipanggil (one-time use).
func (s *SSETicketStore) Consume(ticket string, clientIP string) (uint, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tickets[ticket]

	// Hapus tiket SEGERA — apapun hasilnya, tiket tidak bisa dipakai lagi
	delete(s.tickets, ticket)

	if !ok {
		return 0, errors.New("invalid ticket")
	}
	if time.Now().After(t.ExpiresAt) {
		return 0, errors.New("ticket expired")
	}
	if t.ClientIP != clientIP {
		return 0, errors.New("ticket IP mismatch")
	}

	return t.UserID, nil
}

// cleanupLoop membersihkan tiket expired setiap 30 detik
func (s *SSETicketStore) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for key, t := range s.tickets {
			if now.After(t.ExpiresAt) {
				delete(s.tickets, key)
			}
		}
		s.mu.Unlock()
	}
}
