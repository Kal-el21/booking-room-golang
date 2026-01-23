package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	/*************  ✨ Windsurf Command ⭐  *************/
	// NewNotificationHandler returns a new instance of NotificationHandler with the given notificationService.
	// It is used to create a new handler for the notification API endpoints.
	/*******  21c55d6a-d7dd-469a-a434-2a1b7d94bac6  *******/
	return &NotificationHandler{
		notificationService: notificationService,
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
	if err := h.notificationService.MarkAsRead(uint(id), user.ID); err != nil {
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
	if err := h.notificationService.DeleteNotification(uint(id), user.ID); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete notification", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Notification deleted successfully", nil)
}
