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

	// Temporarily disable foreign key checks to avoid constraint violations
	db.Exec("SET session_replication_role = 'replica'")

	// =============================================
	// PHASE 1 — VEHICLE TRACKING SCHEMA UPDATE
	// =============================================

	// 1. Users table — add driver_license column if not exists
	if err := addUserColumns(db); err != nil {
		return fmt.Errorf("failed to add user columns: %w", err)
	}

	// 2. Cars table — add tracking columns if not exists
	if err := addCarTableColumns(db); err != nil {
		return fmt.Errorf("failed to add car columns: %w", err)
	}

	// 3. Car requests table — add travel info columns if not exists
	if err := addCarRequestColumns(db); err != nil {
		return fmt.Errorf("failed to add car request columns: %w", err)
	}

	// 4. Car bookings table — add lifecycle tracking columns if not exists
	if err := addCarBookingColumns(db); err != nil {
		return fmt.Errorf("failed to add car booking columns: %w", err)
	}

	// 5. Notifications & Schedules — add car booking reference columns
	if err := addNotificationColumns(db); err != nil {
		return fmt.Errorf("failed to add notification columns: %w", err)
	}

	// Re-enable foreign key checks
	db.Exec("SET session_replication_role = 'origin'")

	// Create indexes
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	log.Println("✅ Database migration and indexing completed")

	if err := SeedAdmin(db); err != nil {
		log.Printf("Warning: Failed to seed admin user: %v", err)
	}

	return nil
}

// addUserColumns adds new columns to users table
func addUserColumns(db *gorm.DB) error {
	columns := map[string]string{
		"driver_license": "VARCHAR(50)",
	}

	for col, colType := range columns {
		if !db.Migrator().HasColumn("users", col) {
			sql := fmt.Sprintf("ALTER TABLE users ADD COLUMN IF NOT EXISTS %s %s", col, colType)
			if err := db.Exec(sql).Error; err != nil {
				return fmt.Errorf("failed to add column %s: %w", col, err)
			}
		}
	}

	return nil
}

// addCarTableColumns adds new columns to cars table
func addCarTableColumns(db *gorm.DB) error {
	// Rename location → garage_location if exists
	if db.Migrator().HasColumn("cars", "location") && !db.Migrator().HasColumn("cars", "garage_location") {
		if err := db.Exec("ALTER TABLE cars RENAME COLUMN location TO garage_location").Error; err != nil {
			log.Printf("Warning: Failed to rename location column: %v", err)
		}
	}

	columns := map[string]string{
		"garage_location":  "VARCHAR(255) NOT NULL DEFAULT ''",
		"plate_number":     "VARCHAR(50) UNIQUE",
		"brand":            "VARCHAR(100)",
		"model":            "VARCHAR(100)",
		"vehicle_type":     "VARCHAR(50)",
		"transmission":     "VARCHAR(20)",
		"fuel_type":        "VARCHAR(20)",
		"current_odometer": "INTEGER DEFAULT 0",
	}

	for col, colType := range columns {
		if !db.Migrator().HasColumn("cars", col) {
			sql := fmt.Sprintf("ALTER TABLE cars ADD COLUMN IF NOT EXISTS %s %s", col, colType)
			if err := db.Exec(sql).Error; err != nil {
				return fmt.Errorf("failed to add column %s: %w", col, err)
			}
		}
	}

	return nil
}

// addCarRequestColumns adds new columns to car_requests table
func addCarRequestColumns(db *gorm.DB) error {
	columns := map[string]string{
		"destination":              "VARCHAR(255)",
		"pickup_location":          "VARCHAR(255)",
		"driver_required":          "BOOLEAN DEFAULT FALSE",
		"estimated_distance_km":    "INTEGER",
		"passenger_count":          "INTEGER",
		"needs_fuel_reimbursement": "BOOLEAN DEFAULT FALSE",
		"fuel_note":                "TEXT",
	}

	for col, colType := range columns {
		if !db.Migrator().HasColumn("car_requests", col) {
			sql := fmt.Sprintf("ALTER TABLE car_requests ADD COLUMN IF NOT EXISTS %s %s", col, colType)
			if err := db.Exec(sql).Error; err != nil {
				return fmt.Errorf("failed to add column %s: %w", col, err)
			}
		}
	}

	return nil
}

// addCarBookingColumns adds new columns to car_bookings table
func addCarBookingColumns(db *gorm.DB) error {
	// Handle rename first
	if db.Migrator().HasColumn("car_bookings", "booking_date") && !db.Migrator().HasColumn("car_bookings", "departure_date") {
		if err := db.Exec("ALTER TABLE car_bookings RENAME COLUMN booking_date TO departure_date").Error; err != nil {
			log.Printf("Warning: Failed to rename booking_date column: %v", err)
		}
	}

	columns := map[string]string{
		"driver_id":             "INTEGER",
		"driver_name_snapshot":  "VARCHAR(255)",
		"plate_number_snapshot": "VARCHAR(50)",
		"car_name_snapshot":     "VARCHAR(255)",
		"pickup_location":       "VARCHAR(255)",
		"picked_up_at":          "TIMESTAMP",
		"returned_at":           "TIMESTAMP",
		"start_odometer":        "INTEGER",
		"end_odometer":          "INTEGER",
		"fuel_level_return":     "INTEGER CHECK (fuel_level_return BETWEEN 0 AND 100)",
		"return_notes":          "TEXT",
	}

	for col, colType := range columns {
		if !db.Migrator().HasColumn("car_bookings", col) {
			sql := fmt.Sprintf("ALTER TABLE car_bookings ADD COLUMN IF NOT EXISTS %s %s", col, colType)
			if err := db.Exec(sql).Error; err != nil {
				return fmt.Errorf("failed to add column %s: %w", col, err)
			}
		}
	}

	return nil
}

// addNotificationColumns adds new columns to notifications and notification_schedules
func addNotificationColumns(db *gorm.DB) error {
	// Add idempotent columns
	queries := []string{
		"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS car_id INTEGER",
		"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS room_id INTEGER",
		"ALTER TABLE notification_schedules ADD COLUMN IF NOT EXISTS car_booking_id INTEGER",
		"ALTER TABLE notification_schedules ADD COLUMN IF NOT EXISTS room_booking_id INTEGER",
	}

	for _, sql := range queries {
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to add notification column: %v", err)
		}
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
		// NEW: Car indexes
		{
			table:   "cars",
			name:    "idx_cars_garage_location",
			columns: []string{"garage_location"},
		},
		{
			table:   "cars",
			name:    "idx_cars_vehicle_type",
			columns: []string{"vehicle_type"},
		},
		{
			table:   "cars",
			name:    "idx_cars_status_active",
			columns: []string{"status", "is_active"},
		},
		// NEW: Car booking indexes
		{
			table:   "car_bookings",
			name:    "idx_car_book_lifecycle",
			columns: []string{"status", "picked_up_at", "returned_at"},
		},
		{
			table:   "car_bookings",
			name:    "idx_car_book_driver",
			columns: []string{"driver_id"},
		},
		{
			table:   "car_bookings",
			name:    "idx_car_book_departure",
			columns: []string{"departure_date", "return_date"},
		},
		// NEW: User driver license index
		{
			table:   "users",
			name:    "idx_users_driver_license",
			columns: []string{"driver_license"},
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

	// Conditional unique index for users.driver_license (only for role = 'driver')
	if !db.Migrator().HasIndex("users", "uni_idx_users_driver_license") {
		sql := `CREATE UNIQUE INDEX IF NOT EXISTS uni_idx_users_driver_license ON users(driver_license) WHERE role = 'driver' AND driver_license IS NOT NULL AND deleted_at IS NULL`
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to create unique index for driver_license: %v", err)
		}
	}

	// Unique index for cars.plate_number (partial, only non-null)
	if !db.Migrator().HasIndex("cars", "uni_idx_cars_plate_number") {
		sql := `CREATE UNIQUE INDEX IF NOT EXISTS uni_idx_cars_plate_number ON cars(plate_number) WHERE plate_number IS NOT NULL AND deleted_at IS NULL`
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to create unique index for plate_number: %v", err)
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
