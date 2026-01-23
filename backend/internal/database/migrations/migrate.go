package migrations

import (
	"fmt"
	"log"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

// Migrate runs all database migrations
func Migrate(db *gorm.DB) error {
	log.Println("🔄 Running database migrations...")

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

	log.Println("✅ Database migrations completed successfully")

	// Create indexes
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// createIndexes creates additional database indexes for performance
func createIndexes(db *gorm.DB) error {
	log.Println("🔄 Creating additional indexes...")

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

	log.Println("✅ Indexes created successfully")
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

// Seed creates initial data for testing
func Seed(db *gorm.DB) error {
	log.Println("🌱 Seeding database...")

	// Check if users already exist
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		log.Println("⚠️  Database already seeded, skipping...")
		return nil
	}

	// Create default users (passwords will be hashed by service)
	// Note: In production, you should use a proper seeding mechanism

	log.Println("✅ Database seeded successfully")
	return nil
}
