package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create creates a new notification
func (r *NotificationRepository) Create(notification *models.Notification) error {
	return r.db.Create(notification).Error
}

// FindByID finds notification by ID
func (r *NotificationRepository) FindByID(id uint) (*models.Notification, error) {
	var notification models.Notification
	err := r.db.Preload("Booking").First(&notification, id).Error
	return &notification, err
}

// Update updates notification
func (r *NotificationRepository) Update(notification *models.Notification) error {
	return r.db.Save(notification).Error
}

// Delete deletes notification
func (r *NotificationRepository) Delete(id uint) error {
	return r.db.Delete(&models.Notification{}, id).Error
}

// GetUserNotifications gets all notifications for a user
func (r *NotificationRepository) GetUserNotifications(userID uint, page, pageSize int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64

	offset := (page - 1) * pageSize

	// Count total
	if err := r.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&notifications).Error

	return notifications, total, err
}

// GetUnreadCount gets count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

// MarkAsRead marks notification as read
func (r *NotificationRepository) MarkAsRead(id uint) error {
	now := time.Now()
	return r.db.Model(&models.Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

// MarkAllAsRead marks all notifications as read for a user
func (r *NotificationRepository) MarkAllAsRead(userID uint) error {
	now := time.Now()
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

// CreateSchedule creates notification schedule
func (r *NotificationRepository) CreateSchedule(schedule *models.NotificationSchedule) error {
	return r.db.Create(schedule).Error
}

// GetPendingSchedules gets pending notification schedules
func (r *NotificationRepository) GetPendingSchedules() ([]models.NotificationSchedule, error) {
	var schedules []models.NotificationSchedule
	err := r.db.
		Where("is_sent = ? AND notify_at <= ?", false, time.Now()).
		Preload("Booking").
		Preload("Booking.Request").
		Preload("Booking.Request.User").
		Preload("Booking.Room").
		Find(&schedules).Error
	return schedules, err
}

// MarkScheduleAsSent marks schedule as sent
func (r *NotificationRepository) MarkScheduleAsSent(id uint) error {
	now := time.Now()
	return r.db.Model(&models.NotificationSchedule{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_sent": true,
			"sent_at": now,
		}).Error
}
