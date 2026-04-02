package main

import (
	"fmt"
	"log"
	"os"

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

	// Check if admin already exists
	var existingUser models.User
	result := database.DB.Where("email = ?", adminEmail).First(&existingUser)
	if result.Error == nil {
		log.Printf("⚠️  Admin user with email %s already exists (ID: %d, auth_type: %s)",
			adminEmail, existingUser.ID, existingUser.AuthType)
		log.Println("To update the existing admin, manually update the record or delete and re-run this command.")
		os.Exit(0)
	}

	// Create admin user
	// AuthType HARUS "local" agar login menggunakan password bcrypt di DB,
	// bukan diverifikasi ke Active Directory.
	admin := models.User{
		Name:     adminName,
		Email:    adminEmail,
		Password: hashedPassword,
		AuthType: models.AuthTypeLocal, // ← WAJIB: admin login pakai password lokal, bukan LDAP
		Role:     models.RoleRoomAdmin,
		Division: &adminDivision,
		IsActive: true,
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
