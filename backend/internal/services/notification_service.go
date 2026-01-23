package services

import (
	"errors"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
)

type NotificationService struct {
	notificationRepo *repositories.NotificationRepository
}

func NewNotificationService(notificationRepo *repositories.NotificationRepository) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
	}
}

// GetUserNotifications gets all notifications for current user
func (s *NotificationService) GetUserNotifications(userID uint, page, pageSize int) ([]models.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	return s.notificationRepo.GetUserNotifications(userID, page, pageSize)
}

// GetUnreadCount gets unread notification count
func (s *NotificationService) GetUnreadCount(userID uint) (int64, error) {
	return s.notificationRepo.GetUnreadCount(userID)
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(id uint, userID uint) error {
	notification, err := s.notificationRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Check permission
	if notification.UserID != userID {
		return errors.New("you don't have permission to mark this notification")
	}

	return s.notificationRepo.MarkAsRead(id)
}

// MarkAllAsRead marks all notifications as read for user
func (s *NotificationService) MarkAllAsRead(userID uint) error {
	return s.notificationRepo.MarkAllAsRead(userID)
}

// DeleteNotification deletes a notification
func (s *NotificationService) DeleteNotification(id uint, userID uint) error {
	notification, err := s.notificationRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Check permission
	if notification.UserID != userID {
		return errors.New("you don't have permission to delete this notification")
	}

	return s.notificationRepo.Delete(id)
}
