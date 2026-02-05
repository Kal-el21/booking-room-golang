package handlers

import (
	"strconv"
	"strings"
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

// StreamNotifications handles SSE connection for real-time notifications
// @route GET /api/v1/notifications/stream
func (h *NotificationHandler) StreamNotifications(c *gin.Context) {
	// Get token from Authorization header or query param (for compatibility)
	token := c.GetHeader("Authorization")
	if token != "" {
		// Remove "Bearer " prefix if present
		token = strings.TrimPrefix(token, "Bearer ")
	} else {
		// Fallback to query param
		token = c.Query("token")
	}

	if token == "" {
		c.JSON(401, gin.H{"error": "token required in Authorization header or query parameter"})
		return
	}

	// Validate token
	claims, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(401, gin.H{"error": "invalid or expired token"})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// Get SSE manager
	manager := services.GetSSEManager()

	// Register client
	client := manager.RegisterClient(claims.UserID)
	defer manager.UnregisterClient(client)

	// Send initial connection success message
	c.Writer.Write([]byte(services.FormatSSEMessage(services.SSEMessage{
		Event: "connected",
		Data: map[string]interface{}{
			"user_id":   claims.UserID,
			"timestamp": time.Now().Unix(),
			"message":   "Connected to notification stream",
		},
	})))
	c.Writer.Flush()

	// Create done channel to detect client disconnect
	clientGone := c.Request.Context().Done()

	// Stream messages
	for {
		select {
		case <-clientGone:
			// Client disconnected
			return

		case msg := <-client.Channel:
			// Format and send SSE message
			formattedMsg := services.FormatSSEMessage(msg)
			_, err := c.Writer.Write([]byte(formattedMsg))
			if err != nil {
				// Client disconnected
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
