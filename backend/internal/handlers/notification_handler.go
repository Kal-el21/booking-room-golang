package handlers

import (
	"strconv"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// IssueStreamTicket menerbitkan tiket sementara untuk koneksi SSE.
// Tiket diikat ke IP peminta, expired 5 detik, dan hanya bisa dipakai sekali.
//
// @route POST /api/v1/notifications/stream-ticket
func (h *NotificationHandler) IssueStreamTicket(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	clientIP := c.ClientIP()

	ticket, err := services.GetSSETicketStore().Issue(user.ID, clientIP)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to issue stream ticket", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Stream ticket issued", gin.H{
		"ticket":     ticket,
		"expires_in": 5,
	})
}

// StreamNotifications handles SSE connection.
// Validasi: tiket harus ada, belum expired, dan IP harus sama dengan saat tiket diterbitkan.
//
// @route GET /api/v1/notifications/stream?ticket=<ticket>
func (h *NotificationHandler) StreamNotifications(c *gin.Context) {
	ticket := c.Query("ticket")
	if ticket == "" {
		c.JSON(401, gin.H{"error": "stream ticket is required"})
		return
	}

	clientIP := c.ClientIP()

	// Consume: validasi tiket + IP, langsung hapus (one-time use)
	userID, err := services.GetSSETicketStore().Consume(ticket, clientIP)
	if err != nil {
		// Jangan bocorkan alasan spesifik ke client
		c.JSON(401, gin.H{"error": "invalid or expired stream ticket"})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	manager := services.GetSSEManager()
	client := manager.RegisterClient(userID)
	defer manager.UnregisterClient(client)

	// Kirim pesan koneksi sukses
	c.Writer.Write([]byte(services.FormatSSEMessage(services.SSEMessage{
		Event: "connected",
		Data: map[string]interface{}{
			"user_id":   userID,
			"timestamp": time.Now().Unix(),
			"message":   "Connected to notification stream",
		},
	})))
	c.Writer.Flush()

	clientGone := c.Request.Context().Done()

	for {
		select {
		case <-clientGone:
			return
		case msg := <-client.Channel:
			_, err := c.Writer.Write([]byte(services.FormatSSEMessage(msg)))
			if err != nil {
				return
			}
			c.Writer.Flush()
		}
	}
}

// GetNotifications gets user notifications
// @route GET /api/v1/notifications
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	user, _ := middleware.GetCurrentUser(c)
	notifications, total, err := h.notificationService.GetUserNotifications(user.ID, page, pageSize)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve notifications", err.Error())
		return
	}

	var responses []interface{}
	for _, notif := range notifications {
		responses = append(responses, notif.ToResponse())
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	meta := utils.PaginationMeta{
		CurrentPage: page,
		PerPage:     pageSize,
		Total:       total,
		TotalPages:  totalPages,
	}

	utils.SuccessResponseWithMeta(c, 200, "Notifications retrieved successfully", responses, meta)
}

// GetUnreadCount gets unread notification count
// @route GET /api/v1/notifications/unread-count
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	count, err := h.notificationService.GetUnreadCount(user.ID)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to get unread count", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Unread count retrieved successfully", gin.H{
		"count": count,
	})
}

// MarkAsRead marks notification as read
// @route PUT /api/v1/notifications/:id/mark-as-read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid notification ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.notificationService.MarkAsRead(id, user.ID); err != nil {
		utils.ErrorResponse(c, 400, "Failed to mark as read", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Notification marked as read", nil)
}

// MarkAllAsRead marks all notifications as read
// @route POST /api/v1/notifications/mark-all-as-read
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	if err := h.notificationService.MarkAllAsRead(user.ID); err != nil {
		utils.ErrorResponse(c, 500, "Failed to mark all as read", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "All notifications marked as read", nil)
}

// DeleteNotification deletes a notification
// @route DELETE /api/v1/notifications/:id
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid notification ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.notificationService.DeleteNotification(id, user.ID); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete notification", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Notification deleted successfully", nil)
}
