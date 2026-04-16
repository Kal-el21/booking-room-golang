package main

import (
	"fmt"
	"log"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/config"
	"github.com/Kal-el21/booking-room-golang/backend/internal/database"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Admin user data
	adminEmail := "admin@indore.co.id"
	adminDivision := "IT"
	adminPassword := "admin123"
	adminName := "Admin Indore"

	// Hash password
	hashedPassword, err := utils.HashPassword(adminPassword)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Prepare admin user object
	now := time.Now()
	admin := models.User{
		Name:            adminName,
		Email:           adminEmail,
		Password:        hashedPassword,
		Role:            models.RoleRoomAdmin,
		Division:        &adminDivision,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}

	// Check if admin already exists
	var existingUser models.User
	result := database.DB.Where("email = ?", adminEmail).First(&existingUser)
	if result.Error == nil {
		log.Printf("⚠️  Admin user with email %s already exists (ID: %d). Updating password and verification status...", adminEmail, existingUser.ID)

		// Update existing user
		if err := database.DB.Model(&existingUser).Updates(map[string]interface{}{
			"password":          hashedPassword,
			"is_active":         true,
			"email_verified_at": &now,
			"role":              models.RoleRoomAdmin,
		}).Error; err != nil {
			log.Fatalf("Failed to update admin user: %v", err)
		}

		fmt.Printf("✅ Admin user updated successfully!\n")
	} else {
		// Create new admin user
		if err := database.DB.Create(&admin).Error; err != nil {
			log.Fatalf("Failed to create admin user: %v", err)
		}
		fmt.Printf("✅ Admin user created successfully!\n")
	}

	fmt.Printf("   Email:    %s\n", adminEmail)
	fmt.Printf("   Password: %s\n", adminPassword)
	fmt.Printf("   Role:     %s\n", models.RoleRoomAdmin)
}
