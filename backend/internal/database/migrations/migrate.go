package migrations

import (
	"fmt"
	"log"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"gorm.io/gorm"
)

// Migrate runs all database migrations
func Migrate(db *gorm.DB) error {
	// Drop unique constraint on request_id before migration
	// (allows multiple bookings per request for multi-day and recurring bookings)
	if db.Migrator().HasTable("room_bookings") {
		db.Exec("ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS room_bookings_request_id_key")
		db.Exec("ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS uni_room_bookings_request_id")
	}

	// Auto migrate all models — OTPCode is added here
	err := db.AutoMigrate(
		&models.User{},
		&models.Room{},
		&models.RoomRequest{},
		&models.RoomBooking{},
		&models.Notification{},
		&models.NotificationSchedule{},
		&models.UserSession{},
		&models.UserPreference{},
		&models.AuditLog{},
		&models.OTPCode{},       // OTP codes
		&models.SystemSetting{}, // NEW — system-wide admin settings
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	log.Println("✅ Database migration and indexing completed")

	if err := SeedAdmin(db); err != nil {
		log.Printf("Warning: Failed to seed admin user: %v", err)
	}

	return nil
}

// createIndexes creates additional composite indexes for performance
func createIndexes(db *gorm.DB) error {
	indexes := []struct {
		table   string
		name    string
		columns []string
	}{
		{
			table:   "room_bookings",
			name:    "idx_room_booking_date_time",
			columns: []string{"room_id", "booking_date", "start_time", "end_time"},
		},
		{
			table:   "room_requests",
			name:    "idx_request_user_status",
			columns: []string{"user_id", "status"},
		},
		{
			table:   "notifications",
			name:    "idx_notification_user_read",
			columns: []string{"user_id", "is_read"},
		},
		{
			table:   "user_sessions",
			name:    "idx_session_user_expires",
			columns: []string{"user_id", "access_token_expires_at"},
		},
		// OTP indexes
		{
			table:   "otp_codes",
			name:    "idx_otp_user_type_used",
			columns: []string{"user_id", "type", "is_used"},
		},
		{
			table:   "otp_codes",
			name:    "idx_otp_expires_at",
			columns: []string{"expires_at"},
		},
	}

	for _, idx := range indexes {
		hasIndex := db.Migrator().HasIndex(idx.table, idx.name)
		if !hasIndex {
			sql := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
				idx.name,
				idx.table,
				joinColumns(idx.columns),
			)
			if err := db.Exec(sql).Error; err != nil {
				log.Printf("Warning: Failed to create index %s: %v", idx.name, err)
			}
		}
	}

	return nil
}

func joinColumns(columns []string) string {
	result := ""
	for i, col := range columns {
		if i > 0 {
			result += ", "
		}
		result += col
	}
	return result
}

// SeedAdmin creates the initial admin user if it doesn't already exist
func SeedAdmin(db *gorm.DB) error {
	log.Println("🌱 Checking for admin user...")

	adminEmail := "admin@indore.co.id"
	adminDivision := "IT"
	adminPassword := "rJsm8kFce4"
	adminName := "Admin Indore"

	var count int64
	db.Model(&models.User{}).Where("email = ?", adminEmail).Count(&count)
	if count > 0 {
		log.Println("⚠️  Admin user already exists, skipping...")
		return nil
	}

	hashedPassword, err := utils.HashPassword(adminPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	admin := models.User{
		Name:     adminName,
		Email:    adminEmail,
		Password: hashedPassword,
		Role:     models.RoleRoomAdmin,
		Division: &adminDivision,
		IsActive: true,
	}

	if err := db.Create(&admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	log.Println("✅ Admin user created successfully!")
	return nil
}
