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
	// This allows multiple bookings per request (for multi-day and recurring)
	if db.Migrator().HasTable("room_bookings") {
		db.Exec("ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS room_bookings_request_id_key")
		db.Exec("ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS uni_room_bookings_request_id")
	}

	// Auto migrate all models
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
	)

	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Create indexes
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	log.Println("✅ Database migration and indexing completed")

	// Run Admin Seeding
	if err := SeedAdmin(db); err != nil {
		log.Printf("Warning: Failed to seed admin user: %v", err)
	}

	return nil
}

// createIndexes creates additional database indexes for performance
func createIndexes(db *gorm.DB) error {
	// Composite indexes for better query performance
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
	}

	for _, idx := range indexes {
		// Check if index exists
		hasIndex := db.Migrator().HasIndex(idx.table, idx.name)
		if !hasIndex {
			// Create index using raw SQL for composite indexes
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

// joinColumns joins column names for SQL query
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

// SeedAdmin creates initial admin user if it doesn't exist
func SeedAdmin(db *gorm.DB) error {
	log.Println("🌱 Checking for admin user...")

	adminEmail := "admin@indore.co.id"
	adminDivision := "IT"
	adminPassword := "rJsm8kFce4"
	adminName := "Admin Indore"

	// Check if admin user already exists
	var count int64
	db.Model(&models.User{}).Where("email = ?", adminEmail).Count(&count)
	if count > 0 {
		log.Println("⚠️  Admin user already exists, skipping...")
		return nil
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(adminPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create admin user
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
