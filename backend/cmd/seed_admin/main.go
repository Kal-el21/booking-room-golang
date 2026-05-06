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

	now := time.Now()

	// Check if admin already exists
	var existingUser models.User
	result := database.DB.Where("email = ?", adminEmail).First(&existingUser)
	if result.Error == nil {
		log.Printf("⚠️  Admin user with email %s already exists (ID: %d, auth_type: %s). Updating...",
			adminEmail, existingUser.ID, existingUser.AuthType)

		// Update existing user, ensuring AuthType is local and marking as verified
		updates := map[string]interface{}{
			"password":          hashedPassword,
			"is_active":         true,
			"email_verified_at": &now,
			"role":              models.RoleRoomAdmin,
			"auth_type":         models.AuthTypeLocal,
			"name":              adminName,
			"division":          &adminDivision,
		}
		if err := database.DB.Model(&existingUser).Updates(updates).Error; err != nil {
			log.Fatalf("Failed to update admin user: %v", err)
		}

		// Ensure preferences exist
		var pref models.UserPreference
		if err := database.DB.Where("user_id = ?", existingUser.ID).First(&pref).Error; err != nil {
			pref = models.GetDefaultPreferences(existingUser.ID)
			if err := database.DB.Create(&pref).Error; err != nil {
				log.Printf("⚠️  Warning: failed to create preferences for admin: %v", err)
			}
		}

		fmt.Printf("✅ Admin user updated successfully!\n")
		fmt.Printf("   Email:     %s\n", adminEmail)
		fmt.Printf("   ID:        %d\n", existingUser.ID)
	} else {
		// Create admin user
		// AuthType HARUS "local" agar login menggunakan password bcrypt di DB,
		// bukan diverifikasi ke Active Directory.
		admin := models.User{
			Name:            adminName,
			Email:           adminEmail,
			Password:        hashedPassword,
			AuthType:        models.AuthTypeLocal, // ← WAJIB: admin login pakai password lokal, bukan LDAP
			Role:            models.RoleRoomAdmin,
			Division:        &adminDivision,
			IsActive:        true,
			EmailVerifiedAt: &now,
		}

		if err := database.DB.Create(&admin).Error; err != nil {
			log.Fatalf("Failed to create admin user: %v", err)
		}

		// Buat default preferences agar tidak nil pointer di endpoint /users/me
		preferences := models.UserPreference{
			UserID:             admin.ID,
			Notification24h:    true,
			Notification3h:     true,
			Notification30m:    true,
			EmailNotifications: false,
			OtpLoginEnabled:    false,
		}
		if err := database.DB.Create(&preferences).Error; err != nil {
			// Non-fatal: admin tetap bisa login, preferences bisa dibuat ulang otomatis
			log.Printf("⚠️  Warning: failed to create preferences for admin: %v", err)
		}

		fmt.Printf("✅ Admin user created successfully!\n")
		fmt.Printf("   Email:     %s\n", adminEmail)
		fmt.Printf("   Division:  %s\n", adminDivision)
		fmt.Printf("   Password:  %s\n", adminPassword)
		fmt.Printf("   Role:      %s\n", models.RoleRoomAdmin)
		fmt.Printf("   AuthType:  %s\n", models.AuthTypeLocal)
		fmt.Printf("   ID:        %d\n", admin.ID)
		fmt.Println()
		fmt.Println("⚠️  Simpan password di atas dengan aman — tidak bisa dipulihkan.")
	}
}
